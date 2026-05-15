import myWorkLineIcon from '../../assets/icons/my-work-line.png';

/** Sidebar “My Work” menu icon (custom line calendar asset). */
export function MyWorkMenuIcon() {
  return (
    <img
      src={myWorkLineIcon}
      alt=""
      width={14}
      height={14}
      className="my-work-menu-icon"
      draggable={false}
    />
  );
}
