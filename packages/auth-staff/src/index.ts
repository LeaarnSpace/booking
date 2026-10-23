// Staff identity: accounts, sessions and back-office access, kept in the "backoffice" schema with their
// own connection (STAFF_DATABASE_POOLED_URL) so they can be detached later. Apps use only these exports.
export { createStaffAuth, isAllowedEmail, STAFF_COOKIE_PREFIX, type StaffAuth, type StaffAuthOptions } from "./auth";
export {
  getAccess,
  grantEverything,
  isLastTeamManager,
  listStaff,
  listTeamManagers,
  removeStaffMember,
  setSectionRole,
  type Access,
  type StaffMember,
} from "./access";
export { roleEnum, sectionEnum, type Role, type Section } from "./schema";
