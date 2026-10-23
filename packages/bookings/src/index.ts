// Booking platform data shared by the booking app and the back office. Server only: this connects to the
// booking database. Browser code imports "@learnspace/bookings/client" instead.
export * from "./client.ts";
export { listSpaces, getSpace, type SpaceWithOptions, type Viewer } from "./catalog.ts";
export {
  addOnsLeft,
  busyIntervals,
  cancelBooking,
  createBooking,
  CUSTOMER_TABS,
  getCustomerBooking,
  listCustomerBookings,
  listSchedule,
  retryPayment,
  submitReceipt,
  type CustomerBooking,
  type CustomerTab,
  type NewBooking,
  type Result,
  type ScheduleEntry,
} from "./bookings.ts";
export {
  countUnread,
  getNotificationSettings,
  listNotifications,
  markAllRead,
  setNotificationSetting,
} from "./notifications.ts";
export * as admin from "./admin.ts";
export type { AdminResult, BookingRecord, PriceTables, ServiceRecord, SpaceInput, SpaceRecord } from "./admin.ts";
export {
  countCustomers,
  customerSignInStore,
  getCustomer,
  getCustomers,
  listCustomers,
  updateCustomer,
  type Customer,
} from "./customers.ts";
