import React from "react";
import Menu from "@/components/navigation/Menu";

interface MenuProps {
  visible: boolean;
  hideMenu: () => void;
}

const MenuScreen: React.FC<MenuProps> = ({ visible, hideMenu }) => {
  return <Menu visible={visible} hideMenu={hideMenu} />;
};

export default MenuScreen;
