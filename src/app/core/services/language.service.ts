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
  selected: 'selected'
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
  selected: 'נבחרו'
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

  toggleLanguage(): void {
    const next: SupportedLanguage = this.currentLanguage() === 'EN' ? 'HE' : 'EN';
    this.setLanguage(next);
  }
}
