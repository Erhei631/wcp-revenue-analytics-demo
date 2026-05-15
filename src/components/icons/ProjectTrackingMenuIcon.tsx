import projectTrackingLineIcon from '../../assets/icons/project-tracking-line.png';

/** Sidebar “Project Tracking” menu icon (custom line asset). */
export function ProjectTrackingMenuIcon() {
  return (
    <img
      src={projectTrackingLineIcon}
      alt=""
      width={14}
      height={14}
      className="project-tracking-menu-icon"
      draggable={false}
    />
  );
}
