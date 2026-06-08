import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import React, { forwardRef, Ref, useImperativeHandle, useRef } from "react";
import { Pressable, TouchableOpacity, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { TextField, TextFieldProps } from "./TextField";
import { spacing } from "@/theme/spacing";
import { useAppTheme } from "@/theme/context";
import { ThemedStyle } from "@/theme/types";

export interface SelectFieldProps<T = any>
  extends Omit<TextFieldProps, "ref" | "onValueChange" | "onChange" | "value"> {
  value?: T[];
  renderValue?: (value: T[]) => string;
  onSelect?: (newValue: T[]) => void;
  multiple?: boolean;
  options: T[];
  labelKey: keyof T;
  valueKey: keyof T;
  allowEmpty?: boolean;
}

export interface SelectFieldRef {
  presentOptions: () => void;
  dismissOptions: () => void;
}

function without<T>(array: T[], value: T) {
  return array.filter((v) => v !== value);
}

export const SelectField = forwardRef(function SelectField(
  props: SelectFieldProps,
  ref: Ref<SelectFieldRef>
) {
  const {
    value = [],
    onSelect,
    renderValue,
    options = [],
    multiple = true,
    labelKey,
    valueKey,
    allowEmpty = true,
    ...TextFieldProps
  } = props;
  const sheet = useRef<BottomSheetModal>(null);
  const { bottom } = useSafeAreaInsets();
  const {
    themed,
    theme: { colors },
  } = useAppTheme();

  const disabled = TextFieldProps.editable === false || TextFieldProps.status === "disabled";

  useImperativeHandle(ref, () => ({ presentOptions, dismissOptions }));

  const valueString = renderValue?.(value) ?? value.map((v) => String(v?.[labelKey])).filter(Boolean).join(", ");

  function presentOptions() {
    if (disabled) return;

    sheet.current?.present();
  }

  function dismissOptions() {
    sheet.current?.dismiss();
  }

  function updateValue(option: any) {
    const exists = value.some(
      (v) => v?.[valueKey] === option?.[valueKey]
    );
    if (exists) {
      if (multiple || allowEmpty) {
        onSelect?.(
          multiple
            ? value.filter((v) => v?.[valueKey] !== option?.[valueKey])
            : []
        );
      } else {
        dismissOptions();
      }
    } else {
      onSelect?.(multiple ? [...value, option] : [option]);
      if (!multiple) dismissOptions();
    }
  }

  return (
    <>
      <TouchableOpacity activeOpacity={1} onPress={presentOptions}>
        <View pointerEvents="none">
          <TextField
            {...TextFieldProps}
            value={valueString}
            RightAccessory={(props) => <Icon icon="caretRight" containerStyle={props.style} />}
          />
        </View>
      </TouchableOpacity>

      <BottomSheetModal
        ref={sheet}
        snapPoints={["50%", "75%"]}
        index={0}
        stackBehavior="replace"
        enableDynamicSizing={false}
        backgroundStyle={{ backgroundColor: colors.surface }}
        enableDismissOnClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        footerComponent={
          !multiple
            ? undefined
            : (props) => (
              <BottomSheetFooter
                {...props}
                style={themed($bottomSheetFooter) as ViewStyle}
                bottomInset={bottom}
              >
                <Button title="Dismiss" variant="primary" onPress={dismissOptions} />
              </BottomSheetFooter>
            )
        }
      >
        <BottomSheetFlatList
          style={{ marginBottom: bottom + (multiple ? spacing.xl * 2 : 0) }}
          data={options}
          keyExtractor={(o: any) => String(o?.[valueKey])}
          renderItem={({ item, index }: any) => {
            const selected = value.some((v) => v?.[valueKey] === item?.[valueKey]);
            return (
              <Pressable
                onPress={() => updateValue(item)}
                style={[themed($listItem), index !== 0 && themed($topSeparator)]}
              >
                <Text style={{ flex: 1, color: colors.text }}>{String(item?.[labelKey])}</Text>
                {selected && <Icon icon="check" size={18} color={colors.primary} />}
              </Pressable>
            );
          }}
        />
      </BottomSheetModal>
    </>
  );
});

const $bottomSheetFooter: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.xs
});

const $listItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm + 2,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
});

const $topSeparator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderTopWidth: 1,
  borderTopColor: colors.border,
});