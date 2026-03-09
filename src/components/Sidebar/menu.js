import Item from './item';
import { useTranslation } from "react-i18next";

const Menu = ({ data, isLoading, showMenu, closeMenu }) => {
  const { t } = useTranslation();
  return showMenu ? (
    <div className="space-y-1">
      <ul className="flex flex-col px-2 space-y-1">
        {data.menuItems.map((entry, index) => (
          <Item key={index} data={entry} isLoading={isLoading} closeMenu={closeMenu} />
        ))}
      </ul>
    </div>
  ) : null;
};

Menu.defaultProps = {
  isLoading: false,
  showMenu: false,
};

export default Menu;
