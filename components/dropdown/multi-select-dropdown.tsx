import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Menu, TextInput, TouchableRipple } from 'react-native-paper';
import DropdownInput from './dropdown-input';
import MultiSelectDropdownItem from './multi-select-dropdown-item';
import { DropdownRef, MultiSelectDropdownProps } from './types';
import useDropdown from './use-dropdown';

function MultiSelectDropdown(
  props: MultiSelectDropdownProps,
  ref: React.Ref<DropdownRef>
) {
  const {
    options,
    mode,
    placeholder,
    label,
    menuUpIcon = <TextInput.Icon icon={'menu-up'} pointerEvents="none" />,
    menuDownIcon = <TextInput.Icon icon={'menu-down'} pointerEvents="none" />,
    value = [],
    onSelect,
    menuContentStyle,
    maxMenuHeight,
    CustomMultiSelectDropdownItem = MultiSelectDropdownItem,
    CustomMultiSelectDropdownInput = DropdownInput,
    Touchable = TouchableRipple,
    disabled = false,
    error = false,
    testID,
    menuTestID,
  } = props;

  const selectedLabel = useMemo(
    () =>
      options
        .filter((option) => value.includes(option.value))
        .map((option) => option.label)
        .join(', '),
    [options, value]
  );
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
      testID={menuTestID}
      visible={enable}
      onDismiss={toggleMenu}
      style={menuStyle}
      elevation={5}
      keyboardShouldPersistTaps={'handled'}
      anchor={
        <Touchable
          testID={testID}
          disabled={disabled}
          onPress={toggleMenu}
          onLayout={onLayout}
        >
          <View pointerEvents="none">
            <CustomMultiSelectDropdownInput
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
    >
      <ScrollView style={scrollViewStyle} bounces={false}>
        {options.map((option, index) => {
          return (
            <CustomMultiSelectDropdownItem
              key={option.value}
              option={option}
              value={value}
              width={dropdownLayout.width}
              onSelect={onSelect}
              isLast={options.length <= index + 1}
              menuItemTestID={menuTestID ? `${menuTestID}-${option.value}` : ''}
            />
          );
        })}
      </ScrollView>
    </Menu>
  );
}

export default forwardRef(MultiSelectDropdown);
