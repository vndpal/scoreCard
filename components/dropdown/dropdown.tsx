import { ScrollView, View } from "react-native";
import {
  Icon,
  MD3Colors,
  Menu,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import DropdownItem from "./dropdown-item";
import DropdownInput from "./dropdown-input";
import { DropdownProps, DropdownRef } from "./types";
import useDropdown from "./use-dropdown";
import React, { forwardRef, useImperativeHandle } from "react";

function Dropdown(props: DropdownProps, ref: React.Ref<DropdownRef>) {
  const {
    options,
    mode,
    placeholder,
    label,
    menuUpIcon = <Icon source="camera" color={MD3Colors.error50} size={20} />,
    menuDownIcon = <Icon source="camera" color={MD3Colors.error50} size={20} />,
    value,
    onSelect,
    maxMenuHeight,
    menuContentStyle,
    CustomDropdownItem = DropdownItem,
    CustomDropdownInput = DropdownInput,
    Touchable = TouchableRipple,
    disabled = false,
    error = false,
    testID,
    menuTestID,
  } = props;
  const selectedLabel = options.find((option) => option.value === value)?.label;
  const {
    enable,
    setEnable,
    toggleMenu,
    onLayout,
    menuStyle,
    scrollViewStyle,
    dropdownLayout,
  } = useDropdown(maxMenuHeight);
  const rightIcon = enable ? menuUpIcon : menuDownIcon;

  useImperativeHandle(ref, () => ({
    focus() {
      setEnable(true);
    },
    blur() {
      setEnable(false);
    },
  }));

  return (
    <Menu
      visible={enable}
      onDismiss={toggleMenu}
      style={menuStyle}
      elevation={5}
      keyboardShouldPersistTaps={"handled"}
      anchor={
        <Touchable
          testID={testID}
          disabled={disabled}
          onPress={toggleMenu}
          onLayout={onLayout}
        >
          <View pointerEvents="none">
            <CustomDropdownInput
              placeholder={placeholder}
              label={label}
              rightIcon={rightIcon}
              selectedLabel={selectedLabel}
              mode={mode}
              disabled={disabled}
              error={error}
            />
          </View>
        </Touchable>
      }
      contentStyle={menuContentStyle}
      testID={menuTestID}
    >
      <ScrollView style={scrollViewStyle} bounces={false}>
        {options.map((option, index) => {
          return (
            <CustomDropdownItem
              key={option.value}
              option={option}
              value={value}
              width={dropdownLayout.width}
              toggleMenu={toggleMenu}
              onSelect={onSelect}
              isLast={options.length <= index + 1}
              menuItemTestID={menuTestID ? `${menuTestID}-${option.value}` : ""}
            />
          );
        })}
      </ScrollView>
    </Menu>
  );
}

export default forwardRef(Dropdown);
