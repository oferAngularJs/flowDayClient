import { Injectable, computed, effect, signal } from '@angular/core';

export type SupportedLanguage = 'EN' | 'HE';

export interface TranslationDictionary {
  // Brand & Top Bar
  brandTagline: string;
  planner: string;
  dashboard: string;
  connectGoogle: string;
  switchAccount: string;
  disconnectGoogle: string;
  googleCalendar: string;
  googleTasks: string;
  active: string;
  syncing: string;

  // Greetings & Times of day
  goodMorning: string;
  goodAfternoon: string;
  goodEvening: string;
  goodNight: string;
  makeTodayCount: string;

  // Quick Action Strip
  highPriority: string;
  workload: string;
  newTask: string;

  // Bento Stats
  todaysTasks: string;
  completed: string;
  workloadLeft: string;
  tasksRemaining: string;
  overdue: string;
  noOverdueTasks: string;
  actionRequired: string;
  completionRate: string;

  // AI Insight Card
  flowdayAi: string;
  reschedule: string;
  inspect: string;

  // Focus Task List
  todaysFocus: string;
  pending: string;
  sortByTime: string;
  subtasks: string;
  done: string;
  editTask: string;
  overdueBadge: string;

  // New / Edit Task Modals
  createAndSchedule: string;
  editTaskTitle: string;
  editTaskSubtitle: string;
  taskTitle: string;
  taskTitlePlaceholder: string;
  taskDate: string;
  priority: string;
  category: string;
  scheduleTime: string;
  from: string;
  to: string;
  duration: string;
  cancel: string;
  createTask: string;
  saveChanges: string;
  required: string;
  minDurationError: string;

  // Categories
  personal: string;
  work: string;
  engineering: string;
  design: string;
  product: string;
  operations: string;

  // Priorities
  urgent: string;
  high: string;
  medium: string;
  low: string;

  // Bottom Navigation
  navDashboard: string;
  navTasks: string;
  navPlanner: string;
  navAi: string;
  navAnalytics: string;

  // Planner Page
  backToDashboard: string;
  weeklyAiPlanner: string;
  plannerSubtitle: string;
  reanalyze: string;
  analyzing: string;
  weeklyCapacity: string;
  proposedTasks: string;
  acceptPlan: string;
  adjustFilters: string;
  selected: string;

  // Extra labels, Google sign-in modal & toasts
  total: string;
  overdueJumpTitle: string;
  noOverdueTitle: string;
  justNow: string;
  insightPrefix: string;
  insightSuffix: string;
  activePlanningTarget: string;
  capacityBudget: string;
  dailyPlannedWorkload: string;
  proposedTasksHeader: string;
  selectedOf: string;
  acceptPlanAdd: string;
  signInWithGoogle: string;
  authorizeFlowday: string;
  oauthDescription: string;
  requestedAccess: string;
  calendarScopeDesc: string;
  tasksScopeDesc: string;
  oauthDisclaimer: string;
  signingIn: string;
  signInAndConnect: string;
  continueWithGoogle: string;
  signInFailed: string;
  signInUnauthorizedDomain: string;
  signInNetworkError: string;
  loadingTasks: string;
  signInToStartTitle: string;
  signInToStartBody: string;
  noTasksForDay: string;
  tasksLoadError: string;
  tasksSaveError: string;
  connectGoogleCalendar: string;
  googleSynced: string;
  googleSyncing: string;
  googleChangesWaiting: string;
  fromGoogleCalendar: string;
  allDay: string;
  googleSyncError: string;
  googleEventsLoadError: string;
  googlePermissionMissing: string;
  googleApiDisabled: string;
  toastConnectedAs: string;
  toastDisconnected: string;
  toastReanalyzed: string;
  toastPreferencesUpdated: string;
  toastSelectAtLeastOne: string;
  toastPlanAccepted: string;
  toastTaskCompleted: string;
  toastTaskReopened: string;
  toastTaskCreated: string;
  toastTaskUpdated: string;
  toastSmartReschedule: string;
  toastSortedEarliest: string;
  toastSortedLatest: string;
  toastTasksView: string;
  installTitle: string;
  installBody: string;
  installButton: string;
  installIosBody: string;
  notNow: string;
  inAppBrowserTitle: string;
  inAppBrowserBody: string;
  openInChrome: string;
  copyLink: string;
  linkCopied: string;
  updateAvailable: string;
  updateReload: string;
  offlineNotice: string;
  taskActions: string;
  deleteTask: string;
  deleteConfirm: string;
  toastTaskDeleted: string;
  moveTask: string;
  moveToday: string;
  moveNextDay: string;
  moveNextWeek: string;
  movePickDay: string;
  moveButton: string;
  toastTaskMoved: string;
  notifyMe: string;
  minutesBefore: string;
  minutesShort: string;
  reminderStartsIn: string;
  notificationsBlocked: string;
  alarmSound: string;
  soundChime: string;
  soundBell: string;
  soundDigital: string;
  soundMySong: string;
  chooseSong: string;
  changeSong: string;
  playSound: string;
  stopSound: string;
  songSaved: string;
  songTooLarge: string;
  songUnplayable: string;
  songDeviceOnly: string;
  alarmStop: string;
  alarmOpenTask: string;
  alarmMore: string;
  toastAnalyticsView: string;
}

const EN_TRANSLATIONS: TranslationDictionary = {
  brandTagline: 'Help you flow the day',
  planner: 'Planner',
  dashboard: 'Dashboard',
  connectGoogle: 'Connect',
  switchAccount: 'Switch Account',
  disconnectGoogle: 'Disconnect Google',
  googleCalendar: 'Google Calendar',
  googleTasks: 'Google Tasks',
  active: 'Active',
  syncing: 'Syncing...',

  goodMorning: 'Good morning',
  goodAfternoon: 'Good afternoon',
  goodEvening: 'Good evening',
  goodNight: 'Good night',
  makeTodayCount: "Let's make today count.",

  highPriority: 'High Priority',
  workload: 'Workload',
  newTask: 'New Task',

  todaysTasks: "TODAY'S TASKS",
  completed: 'completed',
  workloadLeft: 'WORKLOAD LEFT',
  tasksRemaining: 'tasks remaining',
  overdue: 'OVERDUE',
  noOverdueTasks: 'No overdue tasks. On track!',
  actionRequired: 'Action required',
  completionRate: 'Completion Rate',

  flowdayAi: 'Flowday AI',
  reschedule: 'Reschedule',
  inspect: 'Inspect',

  todaysFocus: "Today's Focus",
  pending: 'pending',
  sortByTime: 'Sort by time',
  subtasks: 'subtasks',
  done: 'Done',
  editTask: 'Edit task name and hours',
  overdueBadge: 'OVERDUE',

  createAndSchedule: 'Create and schedule a priority task',
  editTaskTitle: 'Edit Task',
  editTaskSubtitle: 'Update task name and schedule hours',
  taskTitle: 'Task Title',
  taskTitlePlaceholder: 'e.g., API Contract Validation',
  taskDate: 'Task Date',
  priority: 'Priority',
  category: 'Category',
  scheduleTime: 'Schedule Time',
  from: 'From',
  to: 'To',
  duration: 'Duration',
  cancel: 'Cancel',
  createTask: 'Create Task',
  saveChanges: 'Save Changes',
  required: 'Required',
  minDurationError: 'Minimum duration is 30 minutes',

  personal: 'Personal',
  work: 'Work',
  engineering: 'Engineering',
  design: 'Design',
  product: 'Product',
  operations: 'Operations',

  urgent: 'URGENT',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',

  navDashboard: 'Dashboard',
  navTasks: 'Tasks',
  navPlanner: 'Planner',
  navAi: 'AI Assistant',
  navAnalytics: 'Analytics',

  backToDashboard: 'Back to Dashboard',
  weeklyAiPlanner: 'Weekly AI Planner',
  plannerSubtitle: 'Smart goal breakdown & work distribution engine',
  reanalyze: 'Re-analyze',
  analyzing: 'Analyzing...',
  weeklyCapacity: 'Weekly Capacity Budget',
  proposedTasks: 'Proposed Breakdown Tasks',
  acceptPlan: 'Accept & Apply Plan',
  adjustFilters: 'Adjust Filters',
  selected: 'selected',
  total: 'total',
  overdueJumpTitle: 'Click to jump to overdue task',
  noOverdueTitle: 'No overdue tasks',
  justNow: 'Just now',
  insightPrefix: 'Thursday is getting busy. Consider moving',
  insightSuffix: 'to Friday to balance your focus capacity.',
  activePlanningTarget: 'ACTIVE PLANNING TARGET',
  capacityBudget: 'Capacity Budget',
  dailyPlannedWorkload: 'DAILY PLANNED WORKLOAD',
  proposedTasksHeader: 'Proposed Tasks ({count})',
  selectedOf: 'Selected {selected} of {total}',
  acceptPlanAdd: 'Accept Plan & Add {count} Tasks',
  signInWithGoogle: 'Sign in with Google',
  authorizeFlowday: 'Authorize Flowday AI',
  oauthDescription: 'Flowday wants access to your Google Account to synchronize schedules and task lists.',
  requestedAccess: 'Requested Access',
  calendarScopeDesc: 'View and edit calendar events to schedule optimal focus blocks.',
  tasksScopeDesc: 'Sync tasks and deadlines with Google Tasks for bidirectional updates.',
  oauthDisclaimer: 'Google will share your name, email address and profile picture with Flowday. Flowday never sees your password.',
  signingIn: 'Signing in...',
  signInAndConnect: 'Sign in & Connect',
  continueWithGoogle: 'Continue with Google',
  signInFailed: 'Google sign-in failed. Please try again.',
  signInUnauthorizedDomain: 'Sign-in is not allowed from {domain}. Open the app at localhost or add the domain in Firebase.',
  signInNetworkError: 'No connection to Google. Check your internet and try again.',
  loadingTasks: 'Loading your tasks...',
  signInToStartTitle: 'Plan your day with Flowday',
  signInToStartBody: 'Sign in with Google to save your tasks and use them on every device.',
  noTasksForDay: 'No tasks for this day yet.',
  tasksLoadError: 'Could not load your tasks. Check your connection.',
  tasksSaveError: 'Could not save the change. Please try again.',
  connectGoogleCalendar: 'Connect Google Calendar',
  googleSynced: 'Synced with Google',
  googleSyncing: 'Syncing with Google...',
  googleChangesWaiting: '{count} waiting',
  fromGoogleCalendar: 'From Google Calendar',
  allDay: 'All day',
  googleSyncError: 'Some tasks could not be synced to Google. Will retry.',
  googleEventsLoadError: 'Could not load your Google Calendar events.',
  googlePermissionMissing: 'Flowday has no permission for your calendar. Tap "Connect Google Calendar" and tick the Calendar and Tasks boxes.',
  googleApiDisabled: 'Google Calendar or Tasks API is not enabled in the Google Cloud project.',
  toastConnectedAs: 'Connected as {email}',
  toastDisconnected: 'Google Account disconnected',
  toastReanalyzed: 'AI re-analyzed workload & balanced Thursday capacity',
  toastPreferencesUpdated: 'Preferences updated',
  toastSelectAtLeastOne: 'Please select at least 1 task to accept.',
  toastPlanAccepted: '✨ {count} tasks accepted and added to Sprint W43!',
  toastTaskCompleted: 'Task "{title}" marked as completed',
  toastTaskReopened: 'Task "{title}" reopened',
  toastTaskCreated: 'Created "{title}" on server',
  toastTaskUpdated: 'Updated "{title}"',
  toastSmartReschedule: 'Smart Reschedule: "Review Q4 design spec" shifted to Friday morning',
  toastSortedEarliest: 'Sorted tasks by earliest time',
  toastSortedLatest: 'Sorted tasks by latest time',
  toastTasksView: 'Tasks view opened',
  installTitle: 'Install Flowday',
  installBody: 'Add it to your home screen and open it like an app.',
  installButton: 'Install',
  installIosBody: 'Tap the Share button, then "Add to Home Screen".',
  notNow: 'Not now',
  inAppBrowserTitle: 'Open in your browser',
  inAppBrowserBody: 'Google sign-in is blocked inside this app. Open Flowday in Chrome or Safari.',
  openInChrome: 'Open in Chrome',
  copyLink: 'Copy link',
  linkCopied: 'Link copied. Paste it in Chrome or Safari.',
  updateAvailable: 'A new version of Flowday is ready.',
  updateReload: 'Update',
  offlineNotice: 'You are offline. Changes will sync when you reconnect.',
  taskActions: 'Task actions',
  deleteTask: 'Delete task',
  deleteConfirm: 'Tap again to delete',
  toastTaskDeleted: 'Deleted "{title}"',
  moveTask: 'Move to another day',
  moveToday: 'Today',
  moveNextDay: 'Next day',
  moveNextWeek: 'In a week',
  movePickDay: 'Or pick a day',
  moveButton: 'Move',
  toastTaskMoved: 'Moved "{title}" to {date}',
  notifyMe: 'Notify me',
  minutesBefore: '{minutes} min before',
  minutesShort: '{minutes}m',
  reminderStartsIn: 'Starts in {minutes} min',
  notificationsBlocked: 'Notifications are blocked. Allow them in your browser settings to get reminders.',
  alarmSound: 'Alarm sound',
  soundChime: 'Chime',
  soundBell: 'Bell',
  soundDigital: 'Digital',
  soundMySong: 'My song',
  chooseSong: 'Choose a song',
  changeSong: 'Change song',
  playSound: 'Play',
  stopSound: 'Stop',
  songSaved: '"{name}" will play when a reminder rings.',
  songTooLarge: 'This file is too large (max 15 MB).',
  songUnplayable: 'This file can not be played. Try an MP3 or M4A file.',
  songDeviceOnly: 'Saved on this device only.',
  alarmStop: 'Stop',
  alarmOpenTask: 'Starts at {time}',
  alarmMore: '+{count} more',
  toastAnalyticsView: 'Analytics view: 94% on-time velocity'
};

const HE_TRANSLATIONS: TranslationDictionary = {
  brandTagline: 'עוזר לך לזרום עם היום',
  planner: 'מתכנן',
  dashboard: 'לוח בקרה',
  connectGoogle: 'התחבר',
  switchAccount: 'החלף חשבון',
  disconnectGoogle: 'נתק חשבון גוגל',
  googleCalendar: 'יומן גוגל',
  googleTasks: 'משימות גוגל',
  active: 'פעיל',
  syncing: 'מסנכרן...',

  goodMorning: 'בוקר טוב',
  goodAfternoon: 'צהריים טובים',
  goodEvening: 'ערב טוב',
  goodNight: 'לילה טוב',
  makeTodayCount: 'בוא נהפוך את היום למוצלח.',

  highPriority: 'עדיפות גבוהה',
  workload: 'עומס עבודה',
  newTask: 'משימה חדשה',

  todaysTasks: 'משימות היום',
  completed: 'הושלמו',
  workloadLeft: 'עומס שנותר',
  tasksRemaining: 'משימות שנותרו',
  overdue: 'באיחור',
  noOverdueTasks: 'אין משימות באיחור. הכל במסלול!',
  actionRequired: 'נדרשת פעולה',
  completionRate: 'אחוז השלמה',

  flowdayAi: 'Flowday בינה מלאכותית',
  reschedule: 'תזמן מחדש',
  inspect: 'בדוק',

  todaysFocus: 'מוקד היום',
  pending: 'ממתינות',
  sortByTime: 'מיין לפי שעה',
  subtasks: 'תתי-משימות',
  done: 'הושלם',
  editTask: 'ערוך שם משימה ושעות',
  overdueBadge: 'באיחור',

  createAndSchedule: 'צור ותזמן משימה בעדיפות',
  editTaskTitle: 'ערוך משימה',
  editTaskSubtitle: 'עדכן שם משימה ושעות מתוזמנות',
  taskTitle: 'שם המשימה',
  taskTitlePlaceholder: 'לדוגמה: אימות חוזה API',
  taskDate: 'תאריך המשימה',
  priority: 'עדיפות',
  category: 'קטגוריה',
  scheduleTime: 'זמן מתוזמן',
  from: 'משעה',
  to: 'עד שעה',
  duration: 'משך זמן',
  cancel: 'ביטול',
  createTask: 'צור משימה',
  saveChanges: 'שמור שינויים',
  required: 'שדה חובה',
  minDurationError: 'משך הזמן המינימלי הוא 30 דקות',

  personal: 'אישי',
  work: 'עבודה',
  engineering: 'הנדסה',
  design: 'עיצוב',
  product: 'מוצר',
  operations: 'תפעול',

  urgent: 'דחוף',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',

  navDashboard: 'לוח בקרה',
  navTasks: 'משימות',
  navPlanner: 'מתכנן',
  navAi: 'עוזר בינה',
  navAnalytics: 'ניתוח נתונים',

  backToDashboard: 'חזרה ללוח הבקרה',
  weeklyAiPlanner: 'מתכנן שבועי חכם',
  plannerSubtitle: 'מנוע חלוקת יעדים ואיזון עומסי עבודה',
  reanalyze: 'נתח מחדש',
  analyzing: 'מנתח...',
  weeklyCapacity: 'תקציב קיבולת שבועי',
  proposedTasks: 'משימות מוצעות לביצוע',
  acceptPlan: 'אשר והחל תוכנית',
  adjustFilters: 'התאם סינונים',
  selected: 'נבחרו',
  total: 'סה״כ',
  overdueJumpTitle: 'לחץ כדי לקפוץ למשימה באיחור',
  noOverdueTitle: 'אין משימות באיחור',
  justNow: 'עכשיו',
  insightPrefix: 'יום חמישי מתמלא. שקול להעביר את',
  insightSuffix: 'ליום שישי כדי לאזן את קיבולת הריכוז שלך.',
  activePlanningTarget: 'יעד תכנון פעיל',
  capacityBudget: 'תקציב קיבולת',
  dailyPlannedWorkload: 'עומס עבודה יומי מתוכנן',
  proposedTasksHeader: 'משימות מוצעות ({count})',
  selectedOf: 'נבחרו {selected} מתוך {total}',
  acceptPlanAdd: 'אשר תוכנית והוסף {count} משימות',
  signInWithGoogle: 'התחברות עם Google',
  authorizeFlowday: 'אישור גישה ל-Flowday AI',
  oauthDescription: 'Flowday מבקש גישה לחשבון Google שלך כדי לסנכרן לוחות זמנים ורשימות משימות.',
  requestedAccess: 'הרשאות מבוקשות',
  calendarScopeDesc: 'צפייה ועריכה של אירועי יומן לתזמון בלוקי ריכוז אופטימליים.',
  tasksScopeDesc: 'סנכרון משימות ומועדים עם Google Tasks לעדכונים דו-כיווניים.',
  oauthDisclaimer: 'Google ישתף עם Flowday את שמך, כתובת האימייל ותמונת הפרופיל. Flowday לעולם לא רואה את הסיסמה שלך.',
  signingIn: 'מתחבר...',
  signInAndConnect: 'התחבר וחבר',
  continueWithGoogle: 'המשך עם Google',
  signInFailed: 'ההתחברות עם Google נכשלה. נסה שוב.',
  signInUnauthorizedDomain: 'ההתחברות לא מורשית מ-{domain}. פתח את האפליקציה ב-localhost או הוסף את הדומיין ב-Firebase.',
  signInNetworkError: 'אין חיבור ל-Google. בדוק את האינטרנט ונסה שוב.',
  loadingTasks: 'טוען את המשימות שלך...',
  signInToStartTitle: 'תכנן את היום שלך עם Flowday',
  signInToStartBody: 'התחבר עם Google כדי לשמור את המשימות שלך ולהשתמש בהן בכל מכשיר.',
  noTasksForDay: 'אין עדיין משימות ליום הזה.',
  tasksLoadError: 'לא ניתן לטעון את המשימות. בדוק את החיבור.',
  tasksSaveError: 'לא ניתן לשמור את השינוי. נסה שוב.',
  connectGoogleCalendar: 'חבר את יומן Google',
  googleSynced: 'מסונכרן עם Google',
  googleSyncing: 'מסנכרן עם Google...',
  googleChangesWaiting: '{count} ממתינים',
  fromGoogleCalendar: 'מיומן Google',
  allDay: 'כל היום',
  googleSyncError: 'חלק מהמשימות לא סונכרנו ל-Google. ננסה שוב.',
  googleEventsLoadError: 'לא ניתן לטעון את אירועי יומן Google.',
  googlePermissionMissing: 'ל-Flowday אין הרשאה ליומן שלך. לחץ על "חבר את יומן Google" וסמן את תיבות היומן והמשימות.',
  googleApiDisabled: 'ה-API של יומן Google או משימות Google לא מופעל בפרויקט ב-Google Cloud.',
  toastConnectedAs: 'מחובר כ-{email}',
  toastDisconnected: 'חשבון Google נותק',
  toastReanalyzed: 'הבינה המלאכותית ניתחה מחדש את העומס ואיזנה את יום חמישי',
  toastPreferencesUpdated: 'ההעדפות עודכנו',
  toastSelectAtLeastOne: 'נא לבחור לפחות משימה אחת לאישור.',
  toastPlanAccepted: '✨ {count} משימות אושרו ונוספו לספרינט W43!',
  toastTaskCompleted: 'המשימה "{title}" סומנה כהושלמה',
  toastTaskReopened: 'המשימה "{title}" נפתחה מחדש',
  toastTaskCreated: 'המשימה "{title}" נוצרה בשרת',
  toastTaskUpdated: 'המשימה "{title}" עודכנה',
  toastSmartReschedule: 'תזמון חכם: "Review Q4 design spec" הועברה ליום שישי בבוקר',
  toastSortedEarliest: 'המשימות מוינו מהמוקדמת למאוחרת',
  toastSortedLatest: 'המשימות מוינו מהמאוחרת למוקדמת',
  toastTasksView: 'תצוגת המשימות נפתחה',
  installTitle: 'התקן את Flowday',
  installBody: 'הוסף למסך הבית ופתח כמו אפליקציה.',
  installButton: 'התקן',
  installIosBody: 'לחץ על כפתור השיתוף ואז על "הוסף למסך הבית".',
  notNow: 'לא עכשיו',
  inAppBrowserTitle: 'פתח בדפדפן',
  inAppBrowserBody: 'ההתחברות עם Google חסומה בתוך האפליקציה הזו. פתח את Flowday ב-Chrome או ב-Safari.',
  openInChrome: 'פתח ב-Chrome',
  copyLink: 'העתק קישור',
  linkCopied: 'הקישור הועתק. הדבק אותו ב-Chrome או ב-Safari.',
  updateAvailable: 'גרסה חדשה של Flowday מוכנה.',
  updateReload: 'עדכן',
  offlineNotice: 'אין חיבור לאינטרנט. השינויים יסונכרנו כשהחיבור יחזור.',
  taskActions: 'פעולות משימה',
  deleteTask: 'מחק משימה',
  deleteConfirm: 'לחץ שוב כדי למחוק',
  toastTaskDeleted: 'המשימה "{title}" נמחקה',
  moveTask: 'העבר ליום אחר',
  moveToday: 'היום',
  moveNextDay: 'יום למחרת',
  moveNextWeek: 'בעוד שבוע',
  movePickDay: 'או בחר יום',
  moveButton: 'העבר',
  toastTaskMoved: 'המשימה "{title}" הועברה ל-{date}',
  notifyMe: 'הזכר לי',
  minutesBefore: '{minutes} דק׳ לפני',
  minutesShort: '{minutes} דק׳',
  reminderStartsIn: 'מתחילה בעוד {minutes} דקות',
  notificationsBlocked: 'ההתראות חסומות. אפשר אותן בהגדרות הדפדפן כדי לקבל תזכורות.',
  alarmSound: 'צליל התראה',
  soundChime: 'צלצול',
  soundBell: 'פעמון',
  soundDigital: 'דיגיטלי',
  soundMySong: 'השיר שלי',
  chooseSong: 'בחר שיר',
  changeSong: 'החלף שיר',
  playSound: 'נגן',
  stopSound: 'עצור',
  songSaved: 'השיר "{name}" יתנגן כשתזכורת מצלצלת.',
  songTooLarge: 'הקובץ גדול מדי (עד 15MB).',
  songUnplayable: 'לא ניתן לנגן את הקובץ. נסה קובץ MP3 או M4A.',
  songDeviceOnly: 'נשמר במכשיר הזה בלבד.',
  alarmStop: 'עצור',
  alarmOpenTask: 'מתחילה ב-{time}',
  alarmMore: '+{count} נוספות',
  toastAnalyticsView: 'ניתוח נתונים: 94% עמידה בזמנים'
};

/**
 * Hebrew versions of the built-in demo content (mock planner data used when no backend responds).
 * Anything not listed here (e.g. real server data or user task titles) is shown unchanged.
 */
const HE_DEMO_CONTENT: Record<string, string> = {
  'AI Model v2.4 Active': 'מודל AI v2.4 פעיל',
  'This Week (Oct 21 - Oct 27)': 'השבוע (21 - 27 באוק׳)',
  'Synced with GitHub & Cal': 'מסונכרן עם GitHub ויומן',
  '/ 18h Total Free': '/ 18 שע׳ פנויות בסך הכל',
  'Feasible (+3h 30m buffer)': 'ישים (מרווח של 3.5 שע׳)',
  'Max 4h/day target': 'יעד של עד 4 שע׳ ביום',
  Mon: 'ב׳',
  Tue: 'ג׳',
  Wed: 'ד׳',
  Thu: 'ה׳',
  Fri: 'ו׳',
  'Thursday warning:': 'אזהרה ליום חמישי:',
  'You already have 4h in sprint tickets. Flowday recommends auto-shifting 1h to Friday morning.':
    'כבר יש לך 4 שעות במשימות ספרינט. Flowday ממליץ להעביר אוטומטית שעה אחת ליום שישי בבוקר.',
  'Balanced schedule:': 'לוח זמנים מאוזן:',
  '1h shifted from Thursday to Friday morning to prevent sprint overload.':
    'שעה אחת הועברה מיום חמישי ליום שישי בבוקר כדי למנוע עומס יתר בספרינט.'
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly currentLanguage = signal<SupportedLanguage>('EN');

  readonly isHebrew = computed(() => this.currentLanguage() === 'HE');

  readonly translations = computed<TranslationDictionary>(() => {
    return this.currentLanguage() === 'HE' ? HE_TRANSLATIONS : EN_TRANSLATIONS;
  });

  constructor() {
    // Restore saved language if available
    try {
      const saved = localStorage.getItem('flowday_lang') as SupportedLanguage;
      if (saved === 'HE' || saved === 'EN') {
        this.currentLanguage.set(saved);
      }
    } catch {
      // Ignore in restricted environments
    }

    // Reactively update HTML document dir and lang attributes
    effect(() => {
      const lang = this.currentLanguage();
      const isRtl = lang === 'HE';
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang.toLowerCase();
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      }
    });
  }

  setLanguage(lang: SupportedLanguage): void {
    this.currentLanguage.set(lang);
    try {
      localStorage.setItem('flowday_lang', lang);
    } catch {
      // Ignore
    }
  }

  /** Translate a key and fill {placeholders} with the given params. */
  t(key: keyof TranslationDictionary, params: Record<string, string | number> = {}): string {
    return this.translations()[key].replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match
    );
  }

  /** Translate known built-in demo content; other text passes through unchanged. */
  demo(text: string | null | undefined): string {
    if (!text) return '';
    return this.isHebrew() ? (HE_DEMO_CONTENT[text] ?? text) : text;
  }

  toggleLanguage(): void {
    const next: SupportedLanguage = this.currentLanguage() === 'EN' ? 'HE' : 'EN';
    this.setLanguage(next);
  }
}
