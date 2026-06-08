import React, { forwardRef, Ref, useImperativeHandle, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/theme/context';

export interface TextFieldProps extends Omit<TextInputProps, "ref"> {
    label?: string;
    helper?: string;
    status?: "error" | "disabled";
    RightAccessory?: React.ComponentType<{ style: any }>;
    LeftAccessory?: React.ComponentType<{ style: any }>;
    containerStyle?: any;
    inputWrapperStyle?: any;
    isRequired?: boolean;
}

export const TextField = forwardRef(function TextField(
    { label, helper, status, style, containerStyle, inputWrapperStyle, isRequired, RightAccessory, LeftAccessory, ...props }: TextFieldProps,
    ref: Ref<TextInput>
) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => inputRef.current as TextInput);

    const isError = status === 'error';
    const isDisabled = status === 'disabled' || props.editable === false;

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={styles.label}>
                    {label}
                    {isRequired && <Text style={{ color: theme.colors.error }}> *</Text>}
                </Text>
            )}
            <View style={[styles.inputContainer, isError && styles.errorBorder, isDisabled && styles.disabledContainer, inputWrapperStyle]}>
                {LeftAccessory && (
                    <View style={styles.leftAccessory}>
                        <LeftAccessory style={styles.accessoryStyle} />
                    </View>
                )}
                <TextInput
                    ref={inputRef}
                    style={[styles.input, isDisabled && styles.disabledInput, style]}
                    placeholderTextColor={theme.colors.textDim}
                    autoComplete={"off"}
                    importantForAutofill={"no"}
                    editable={!isDisabled}
                    {...props}
                />
                {RightAccessory && (
                    <View style={styles.rightAccessory}>
                        <RightAccessory style={styles.accessoryStyle} />
                    </View>
                )}
            </View>
            {helper && <Text style={[styles.helperText, isError && styles.errorText]}>{helper}</Text>}
        </View>
    );
});

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: theme.typography.s,
        color: theme.colors.textDim,
        marginBottom: theme.spacing.xs,
        fontWeight: theme.typography.medium,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: theme.spacing.md,
        minHeight: 48,
    },
    disabledContainer: {
        backgroundColor: theme.colors.palette.slate200,
    },
    errorBorder: {
        borderColor: theme.colors.error,
    },
    leftAccessory: {
        marginRight: theme.spacing.xs,
    },
    rightAccessory: {
        marginLeft: theme.spacing.xs,
    },
    accessoryStyle: {
        justifyContent: "center",
        alignItems: "center",
    },
    input: {
        flex: 1,
        color: theme.colors.text,
        fontSize: theme.typography.m,
        height: '100%',
        paddingVertical: theme.spacing.sm,
    },
    disabledInput: {
        color: theme.colors.textDim,
    },
    helperText: {
        color: theme.colors.textDim,
        fontSize: theme.typography.xs,
        marginTop: theme.spacing.xs,
    },
    errorText: {
        color: theme.colors.error,
    },
});
