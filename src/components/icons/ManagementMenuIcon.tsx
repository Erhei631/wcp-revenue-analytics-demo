import managementIcon from '../../assets/icons/management.png';

/** Sidebar “Management” menu icon (custom asset). */
export function ManagementMenuIcon() {
  return (
    <img
      src={managementIcon}
      alt=""
      width={14}
      height={14}
      className="management-menu-icon"
      draggable={false}
    />
  );
}
