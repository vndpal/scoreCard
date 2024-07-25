import { ForwardRefExoticComponent } from 'react';
import { PressableProps, View, ViewStyle } from 'react-native';
import { TextInputLabelProp } from 'react-native-paper/lib/typescript/components/TextInput/types';
import { TextInputProps } from 'react-native-paper';

export type DropdownInputProps = {
  placeholder?: string;
  label?: TextInputLabelProp;
  rightIcon: JSX.Element;
  selectedLabel?: string;
  mode?: 'flat' | 'outlined';
  disabled?: boolean;
  error?: boolean;
};

export type Option = {
  label: string;
  value: string;
};

export type DropdownProps = {
  value?: string;
  onSelect?: (value: string) => void;
  options: Option[];
  menuUpIcon?: JSX.Element;
  menuDownIcon?: JSX.Element;
  maxMenuHeight?: number;
  menuContentStyle?: ViewStyle;
  CustomDropdownItem?: (props: DropdownItemProps) => JSX.Element;
  CustomDropdownInput?: (props: DropdownInputProps) => JSX.Element;
  Touchable?: ForwardRefExoticComponent<
    PressableProps & React.RefAttributes<View>
  >;
  testID?: string;
  menuTestID?: string;
} & Pick<
  TextInputProps,
  'placeholder' | 'label' | 'mode' | 'disabled' | 'error'
>;

export type MultiSelectDropdownProps = {
  value?: string[];
  onSelect?: (value: string[]) => void;
  options: Option[];
  menuUpIcon?: JSX.Element;
  menuDownIcon?: JSX.Element;
  Touchable?: ForwardRefExoticComponent<
    PressableProps & React.RefAttributes<View>
  >;
  maxMenuHeight?: number;
  menuContentStyle?: ViewStyle;
  CustomMultiSelectDropdownItem?: (
    props: MultiSelectDropdownItemProps
  ) => JSX.Element;
  CustomMultiSelectDropdownInput?: (props: DropdownInputProps) => JSX.Element;
  testID?: string;
  menuTestID?: string;
} & Pick<
  TextInputProps,
  'placeholder' | 'label' | 'mode' | 'disabled' | 'error'
>;

export type DropdownItemProps = {
  option: Option;
  value?: string;
  onSelect?: (value: string) => void;
  width: number;
  toggleMenu: () => void;
  isLast: boolean;
  menuItemTestID?: string;
};

export type MultiSelectDropdownItemProps = {
  option: Option;
  value?: string[];
  onSelect?: (value: string[]) => void;
  width: number;
  isLast: boolean;
  menuItemTestID?: string;
};

export type DropdownRef = {
  blur: () => void;
  focus: () => void;
};
