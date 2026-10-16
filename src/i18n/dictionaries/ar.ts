// =============================================================================
// i18n — Dictionnaire ARABE
// -----------------------------------------------------------------------------
// Typé `Dictionary` : TypeScript signale toute clé manquante ou en trop.
// =============================================================================

import type { Dictionary } from './fr'

export const ar: Dictionary = {
  common: {
    appName: 'FleetTrack',
    appTagline: 'إدارة الأسطول',
    language: 'اللغة',
    cancel: 'إلغاء',
    close: 'إغلاق',
  },

  nav: {
    menu: 'القائمة الرئيسية',
    parc: 'أسطول المركبات',
    admin: 'الإدارة',
    logout: 'تسجيل الخروج',
  },

  documents: {
    ASSURANCE: 'التأمين',
    VISITE_TECHNIQUE: 'الفحص التقني',
    VIGNETTE: 'الملصق',
  },

  status: {
    valid: { emoji: '🟢', label: 'سارية المفعول' },
    warning: { emoji: '🟠', label: 'للمراجعة قريبًا' },
    danger: { emoji: '🔴', label: 'عاجل' },
    expired: { emoji: '🔴', label: 'منتهية الصلاحية' },
    unknown: { emoji: '⚪', label: 'غير محدد' },
  },

  dashboard: {
    title: 'أسطول المركبات',
    subtitle: '{count} مركبة',
    subtitlePlural: '{count} مركبات',
    toWatch: '{count} بحاجة إلى متابعة',
    searchPlaceholder: 'ابحث عن مركبة…',
    searchLabel: 'البحث عن مركبة بالاسم',
    filtersLabel: 'التصفية حسب الحالة',
    filterAll: 'الكل',
    filterValid: 'سارية',
    filterUrgent: 'عاجل',
    addVehicle: 'إضافة مركبة',
    expiresOn: 'ينتهي في {date}',
    daysIn: 'ينتهي خلال {count} يوم',
    daysAgo: 'منتهٍ منذ {count} يوم',
    today: 'ينتهي اليوم',
    renew: 'تجديد',
    renewNamed: 'تجديد — {document}',
    deleteVehicle: 'حذف المركبة',
    deleteNamed: 'حذف المركبة {name}',
    emptyTitle: 'لا توجد مركبات مسجلة',
    emptyAdmin: 'ابدأ بإضافة أول مركبة.',
    emptyUser: 'ستظهر المركبات هنا بمجرد تسجيلها.',
    noResult: 'لا توجد مركبة مطابقة لبحثك',
    resetFilters: 'إعادة ضبط التصفية',
  },

  renew: {
    title: 'تجديد الوثيقة',
    current: 'تاريخ الانتهاء الحالي',
    newDate: 'تاريخ الانتهاء الجديد',
    hint: 'سيتم جدولة تذكير في تقويم Google تلقائيًا قبل 4 أيام من هذا التاريخ.',
    confirm: 'تأكيد التجديد',
    submitting: 'جارٍ التحديث…',
    success: 'تم تجديد « {document} » حتى {date}.',
  },

  delete: {
    title: 'حذف المركبة؟',
    description:
      'هل أنت متأكد؟ هذا الإجراء نهائي ولا يمكن التراجع عنه. سيحذف نهائيًا المركبة وصورتها وجميع وثائقها (التأمين، الفحص التقني، الملصق) وتذكيرات تقويم Google الخاصة بها.',
    confirm: 'حذف نهائي',
    submitting: 'جارٍ الحذف…',
    success: 'تم حذف المركبة « {name} ».',
  },
}
