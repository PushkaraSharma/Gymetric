import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import React, { forwardRef, Ref, useImperativeHandle, useRef } from "react";
import { TouchableOpacity, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { ListItem } from "./ListItem";
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
      onSelect?.(
        multiple
          ? value.filter((v) => v?.[valueKey] !== option?.[valueKey])
          : []
      );
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
        snapPoints={["25%", "50%"]}
        index={0}
        stackBehavior="replace"
        enableDynamicSizing={false}
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
                style={themed($bottomSheetFooter)}
                bottomInset={bottom}
              >
                <Button text="Dismiss" preset="reversed" onPress={dismissOptions} />
              </BottomSheetFooter>
            )
        }
      >
        <BottomSheetFlatList
          style={{ marginBottom: bottom + (multiple ? spacing.xl * 2 : 0) }}
          data={options}
          keyExtractor={(o: any) => String(o?.[valueKey])}
          renderItem={({ item, index }: any) => (
            <ListItem
              text={String(item?.[labelKey])}
              topSeparator={index !== 0}
              style={themed($listItem)}
              rightIcon={
                value.some((v) => v?.[valueKey] === item?.[valueKey])
                  ? "check"
                  : undefined
              } rightIconColor={colors.palette.angry500}
              onPress={() => updateValue(item)}
            />
          )}
        />
      </BottomSheetModal>
    </>
  );
});

const $bottomSheetFooter: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.xs,
});

const $listItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
});