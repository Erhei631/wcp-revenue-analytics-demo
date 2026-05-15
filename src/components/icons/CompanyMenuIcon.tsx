import companyLineIcon from '../../assets/icons/company-line.png';

/** Sidebar “Company” menu icon (custom line asset). */
export function CompanyMenuIcon() {
  return (
    <img
      src={companyLineIcon}
      alt=""
      width={14}
      height={14}
      className="company-menu-icon"
      draggable={false}
    />
  );
}
