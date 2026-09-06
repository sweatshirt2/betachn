/**
 * Typed i18n dictionaries — EN + full AM parity required (AGENTS.md §8).
 * A missing Amharic entry is a bug: `Dict` is fully concrete (no
 * `Record<string, string>`), so `am` must carry every key `en` has.
 */
export type Dict = {
  common: {
    appName: string;
    loading: string;
    retry: string;
    cancel: string;
    save: string;
    add: string;
    remove: string;
    close: string;
    back: string;
    go: string;
    name: string;
    undo: string;
    loadError: string;
    checkConnection: string;
  };
  nav: {
    today: string;
    chores: string;
    household: string;
    more: string;
    routines: string;
    home: string;
    supplies: string;
    shopping: string;
    activity: string;
    notifications: string;
    settings: string;
    printWeek: string;
    create: string;
    morning: string;
    afternoon: string;
    evening: string;
    newResponsibility: string;
    newShoppingItem: string;
    newPerson: string;
    soon: string;
    family: string;
    expense: string;
    bill: string;
    upToDate: string;
    previewingAs: string;
    exit: string;
    primary: string;
    themePreview: string;
  };
  auth: {
    welcomeBack: string;
    signInSubtitle: string;
    householdCode: string;
    username: string;
    password: string;
    signIn: string;
    signingIn: string;
    newHere: string;
    setupHousehold: string;
    rateLimited: string;
    switchProfile: string;
    switchProfileAria: string;
    passwordFor: string;
    wrongPassword: string;
  };
  today: {
    today: string;
    empty: string;
    missedRecently: string;
    attention: string;
    comingUp: string;
    completedWeek: string;
    upForGrabs: string;
  };
  chores: {
    title: string;
    mine: string;
    everyone: string;
    overdue: string;
    allClear: string;
    allClearHint: string;
    newChore: string;
    choreTitle: string;
    repeats: string;
    once: string;
    daily: string;
    weekly: string;
    monthly: string;
    assignedTo: string;
    addChore: string;
    adding: string;
    steps: string;
    open: string;
    notFound: string;
    notFoundHint: string;
    backToChores: string;
    complete: string;
    completeAria: string;
    scope: string;
    due: string;
    titlePlaceholder: string;
    updatedToast: string;
    alreadyHandled: string;
  };
  household: {
    title: string;
    roles: string;
    finished: string;
    missed: string;
    previewAs: string;
    removePerson: string;
    familyRoles: string;
    resetExplain: string;
    newRole: string;
    noRole: string;
    owner: string;
    roleLabel: string;
    profileUpdated: string;
    permissionsReset: string;
    builtinPreset: string;
    customRole: string;
    permissionsCount: string;
    reset: string;
    saveName: string;
    previewAsName: string;
    removeConfirm: string;
    keep: string;
    personRemovedToast: string;
  };
  ops: {
    routines: string;
    routinesHint: string;
    home: string;
    rooms: string;
    assets: string;
    supplies: string;
    shopping: string;
    listEmpty: string;
    supplyAvailable: string;
    supplyLow: string;
    supplyOut: string;
    dueDate: string;
    buy: string;
    buyAria: string;
    addItem: string;
    bought: string;
    shoppingEmptyHint: string;
    newSupply: string;
    newRoutine: string;
    organizationalOnly: string;
    assetsCount: string;
    newRoom: string;
    newAsset: string;
    roomOptional: string;
    noRoom: string;
    addAsset: string;
    markAria: string;
    serviceLogged: string;
    itemPlaceholder: string;
    supplyPlaceholder: string;
    roomPlaceholder: string;
    assetPlaceholder: string;
    routinePlaceholder: string;
  };
  activity: {
    title: string;
    quiet: string;
    quietHint: string;
    filterLabel: string;
    occurrenceCompleted: string;
    occurrenceMissed: string;
    occurrenceSkipped: string;
    personAdded: string;
    responsibilityCreated: string;
    itemPurchased: string;
  };
  notify: {
    title: string;
    caughtUp: string;
    readAll: string;
    whatToReceive: string;
    reminderDigest: string;
    completionRecorded: string;
    missedDetected: string;
    backupNudge: string;
    caughtUpHint: string;
    prefsAria: string;
    categoryAria: string;
    on: string;
    off: string;
    catAssignment: string;
    catReminder: string;
    catCompletion: string;
    catMissed: string;
    catFinance: string;
    catBill: string;
    catBackup: string;
  };
  settings: {
    title: string;
    language: string;
    theme: string;
    calendar: string;
    household: string;
    backup: string;
    saveCopy: string;
    openCopy: string;
    signOut: string;
    gregorian: string;
    ethiopian: string;
    both: string;
    codeShare: string;
    exportSaved: string;
    exportFailed: string;
    importOpened: string;
    importBlocked: string;
    noPasswords: string;
    themeFamily: string;
    themeEmber: string;
    themeHighland: string;
  };
  print: {
    title: string;
    signInToPrint: string;
    printHint: string;
    printBtn: string;
    customize: string;
    prevWeek: string;
    nextWeek: string;
    membersAria: string;
    checkboxes: string;
    nothingScheduled: string;
  };
  onboarding: {
    languageTitle: string;
    householdTitle: string;
    changeLater: string;
    householdName: string;
    yourName: string;
    continue: string;
    addPeople: string;
    addPeopleHint: string;
    personNameAria: string;
    personRoleAria: string;
    addAnother: string;
    settingUp: string;
    start: string;
    householdPlaceholder: string;
    ownerPlaceholder: string;
    roleMother: string;
    roleFather: string;
    roleGuardian: string;
    roleAdult: string;
    roleTeenager: string;
    roleResponsibleChild: string;
    roleChild: string;
    roleSupervisedChild: string;
    roleFamilyMember: string;
  };
};

export const en: Dict = {
  common: {
    appName: 'Chorify',
    loading: 'Loading…',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    add: 'Add',
    remove: 'Remove',
    close: 'Close',
    back: 'Back',
    go: 'Go',
    name: 'Name',
    undo: 'Undo',
    loadError: 'Something failed to load',
    checkConnection: 'Check your connection and try again.',
  },
  nav: {
    today: 'Today',
    chores: 'Chores',
    household: 'Household',
    more: 'More',
    routines: 'Routines',
    home: 'Home',
    supplies: 'Supplies',
    shopping: 'Shopping',
    activity: 'Activity',
    notifications: 'Notifications',
    settings: 'Settings',
    printWeek: 'Print week',
    create: 'Create',
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    newResponsibility: 'Responsibility',
    newShoppingItem: 'Shopping item',
    newPerson: 'Person',
    soon: 'soon',
    family: 'family',
    expense: 'Expense',
    bill: 'Bill',
    upToDate: '✓ Up to date',
    previewingAs: 'Previewing as {{name}} — read-only',
    exit: 'Exit',
    primary: 'Primary',
    themePreview: 'Theme preview',
  },
  auth: {
    welcomeBack: 'Welcome back',
    signInSubtitle: 'Sign in to your household.',
    householdCode: 'Household code',
    username: 'Username',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    newHere: 'New here?',
    setupHousehold: 'Set up your household',
    rateLimited: 'Too many attempts — try again in {{seconds}}s.',
    switchProfile: 'Switch profile',
    switchProfileAria: 'Switch profile (currently {{name}})',
    passwordFor: 'Password for {{name}}',
    wrongPassword: 'Wrong password — try again.',
  },
  today: {
    today: 'Today',
    empty: 'Nothing due — enjoy the quiet.',
    missedRecently: 'Missed recently',
    attention: 'Attention',
    comingUp: 'Coming up',
    completedWeek: 'responsibilities completed this week.',
    upForGrabs: 'Up for grabs',
  },
  chores: {
    title: 'Chores',
    mine: 'Mine',
    everyone: 'Everyone',
    overdue: 'Overdue',
    allClear: 'All clear',
    allClearHint: 'Nothing here — enjoy it while it lasts.',
    newChore: 'New chore',
    choreTitle: 'Title',
    repeats: 'Repeats',
    once: 'Just once',
    daily: 'Every day',
    weekly: 'Every week',
    monthly: 'Every month',
    assignedTo: 'Assigned to (empty = up for grabs)',
    addChore: 'Add chore',
    adding: 'Adding…',
    steps: 'Steps',
    open: 'Open',
    notFound: 'Chore not found',
    notFoundHint: 'It may have been archived.',
    backToChores: 'Back to chores',
    complete: 'Complete',
    completeAria: 'Complete: {{title}}',
    scope: 'Chore scope',
    due: 'Due {{date}}',
    titlePlaceholder: 'Take out the trash',
    updatedToast: '{{title}} updated.',
    alreadyHandled: 'Already handled — list refreshed.',
  },
  household: {
    title: 'Household',
    roles: 'Roles',
    finished: 'finished',
    missed: 'missed',
    previewAs: 'Preview as',
    removePerson: 'Remove person',
    familyRoles: 'Family roles',
    resetExplain:
      'Reset restores factory defaults for built-ins, or the create-time snapshot for custom roles.',
    newRole: 'New role name',
    noRole: 'No role',
    owner: 'owner',
    roleLabel: 'Role',
    profileUpdated: 'Profile updated.',
    permissionsReset: 'Permissions reset to default.',
    builtinPreset: 'Built-in preset',
    customRole: 'Custom role',
    permissionsCount: '{{count}} permissions',
    reset: 'Reset',
    saveName: 'Save name',
    previewAsName: 'Preview as {{name}}',
    removeConfirm:
      'Remove {{name}}? Their account and sessions go too — history keeps their name.',
    keep: 'Keep',
    personRemovedToast: '{{name}} removed.',
  },
  ops: {
    routines: 'Routines',
    routinesHint: 'Buckets that organize chores — they never schedule anything themselves.',
    home: 'Home',
    rooms: 'Rooms',
    assets: 'Assets',
    supplies: 'Supplies',
    shopping: 'Shopping',
    listEmpty: 'List is empty',
    supplyAvailable: 'Available',
    supplyLow: 'Running low',
    supplyOut: 'Out',
    dueDate: 'Due {{date}}',
    buy: 'Buy',
    buyAria: 'Buy {{name}}',
    addItem: 'Add item',
    bought: 'Bought ({{count}})',
    shoppingEmptyHint: 'Running low on something? Add it here.',
    newSupply: 'New supply',
    newRoutine: 'New routine',
    organizationalOnly: 'Organizational only',
    assetsCount: '{{count}} assets',
    newRoom: 'New room',
    newAsset: 'New asset',
    roomOptional: 'Room (optional)',
    noRoom: 'No room',
    addAsset: 'Add asset',
    markAria: 'Mark {{name}} {{state}}',
    serviceLogged: 'Service logged.',
    itemPlaceholder: 'Rice',
    supplyPlaceholder: 'Detergent',
    roomPlaceholder: 'Kitchen',
    assetPlaceholder: 'Washing machine',
    routinePlaceholder: 'Morning',
  },
  activity: {
    title: 'Activity',
    quiet: 'Quiet so far',
    quietHint: 'Household stories will appear here.',
    filterLabel: 'Filter by member (optional)',
    occurrenceCompleted: '{{title}} completed.',
    occurrenceMissed: '{{title}} was missed.',
    occurrenceSkipped: '{{title}} skipped.',
    personAdded: '{{name}} joined the household.',
    responsibilityCreated: '{{title}} added.',
    itemPurchased: '{{title}} bought.',
  },
  notify: {
    title: 'Notifications',
    caughtUp: 'All caught up',
    readAll: 'Read all',
    whatToReceive: 'What to receive',
    reminderDigest: '{{count}} due today — tap to open chores.',
    completionRecorded: '{{title}} completed.',
    missedDetected: '{{title}} was missed.',
    backupNudge: 'Back up {{name}} — save a copy.',
    caughtUpHint: 'Reminders and updates land here.',
    prefsAria: 'Preferences',
    categoryAria: '{{category}} notifications',
    on: 'On',
    off: 'Off',
    catAssignment: 'Assignments',
    catReminder: 'Reminders',
    catCompletion: 'Completions',
    catMissed: 'Missed',
    catFinance: 'Finance',
    catBill: 'Bills',
    catBackup: 'Backup',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    theme: 'Theme',
    calendar: 'Calendar',
    household: 'Household',
    backup: 'Backup',
    saveCopy: 'Save household copy',
    openCopy: 'Open household copy',
    signOut: 'Sign out',
    gregorian: 'Gregorian',
    ethiopian: 'Ethiopian',
    both: 'Both',
    codeShare: 'Code {{code}} — share it to log in on another profile.',
    exportSaved: 'Household copy saved.',
    exportFailed: 'Export failed — try again.',
    importOpened: 'Household copy opened.',
    importBlocked: 'Import blocked — nothing was changed.',
    noPasswords: 'Household copies never include passwords.',
    themeFamily: 'Family',
    themeEmber: 'Ember',
    themeHighland: 'Highland',
  },
  print: {
    title: 'Print week',
    signInToPrint: 'Sign in to print',
    printHint: 'Weekly sheets print from your household.',
    printBtn: 'Print',
    customize: 'Customize',
    prevWeek: '← Prev week',
    nextWeek: 'Next week →',
    membersAria: 'Members',
    checkboxes: 'Checkboxes',
    nothingScheduled: 'Nothing scheduled this week.',
  },
  onboarding: {
    languageTitle: 'Language / ቋንቋ',
    householdTitle: 'Your household',
    changeLater: 'You can change this later.',
    householdName: 'Household name',
    yourName: 'Your name',
    continue: 'Continue',
    addPeople: 'Add people',
    addPeopleHint: 'Anyone can be added later too.',
    personNameAria: 'Person {{index}} name',
    personRoleAria: 'Person {{index}} role',
    addAnother: '+ Add another',
    settingUp: 'Setting up…',
    start: 'Start',
    householdPlaceholder: 'Bekele Family',
    ownerPlaceholder: 'Hana',
    roleMother: 'Mother',
    roleFather: 'Father',
    roleGuardian: 'Guardian',
    roleAdult: 'Adult',
    roleTeenager: 'Teenager',
    roleResponsibleChild: 'Responsible child',
    roleChild: 'Child',
    roleSupervisedChild: 'Supervised child',
    roleFamilyMember: 'Family member',
  },
};

export const am: Dict = {
  common: {
    appName: 'ቾሪፋይ',
    loading: 'በመጫን ላይ…',
    retry: 'እንደገና ሞክር',
    cancel: 'ሰርዝ',
    save: 'አስቀምጥ',
    add: 'ጨምር',
    remove: 'አስወግድ',
    close: 'ዝጋ',
    back: 'ተመለስ',
    go: 'ግባ',
    name: 'ስም',
    undo: 'ተመልስ',
    loadError: 'የሆነ ነገር መጫን አልተሳካም',
    checkConnection: 'ግንኙነትዎን ያረጋግጡ እና እንደገና ይሞክሩ።',
  },
  nav: {
    today: 'ዛሬ',
    chores: 'ሥራዎች',
    household: 'ቤተሰብ',
    more: 'ተጨማሪ',
    routines: 'ሥርዓቶች',
    home: 'ቤት',
    supplies: 'ቁሳቁሶች',
    shopping: 'ግዢያ',
    activity: 'እንቅስቃሴ',
    notifications: 'ማሳወቂያዎች',
    settings: 'ቅንብሮች',
    printWeek: 'ሳምንቱን አትም',
    create: 'ፍጠር',
    morning: 'እንደምን አደሩ',
    afternoon: 'እንደምን ዋሉ',
    evening: 'እንደምን አመሹ',
    newResponsibility: 'ኃላፊነት',
    newShoppingItem: 'የግዢያ ዕቃ',
    newPerson: 'ሰው',
    soon: 'በቅርቡ',
    family: 'ቤተሰብ',
    expense: 'ወጪ',
    bill: 'ክፍያ',
    upToDate: '✓ የተመሳሰለ',
    previewingAs: 'እንደ {{name}} በመመልከት ላይ — ማንበብ ብቻ',
    exit: 'ውጣ',
    primary: 'ዋና',
    themePreview: 'የገጽታ ቅድመ-እይታ',
  },
  auth: {
    welcomeBack: 'እንኳን ደህና መጡ',
    signInSubtitle: 'ወደ ቤተሰብዎ ይግቡ።',
    householdCode: 'የቤተሰብ ኮድ',
    username: 'የተጠቃሚ ስም',
    password: 'የይለፍ ቃል',
    signIn: 'ግባ',
    signingIn: 'በመግባት ላይ…',
    newHere: 'አዲስ ነዎት?',
    setupHousehold: 'ቤተሰብዎን ያዘጋጁ',
    rateLimited: 'ብዙ ሙከራዎች — እባክዎ በ{{seconds}} ሰከንድ ውስጥ እንደገና ይሞክሩ።',
    switchProfile: 'መገለጫ ቀይር',
    switchProfileAria: 'መገለጫ ቀይር (አሁን {{name}})',
    passwordFor: 'የ{{name}} የይለፍ ቃል',
    wrongPassword: 'የተሳሳተ የይለፍ ቃል — እንደገና ይሞክሩ።',
  },
  today: {
    today: 'ዛሬ',
    empty: 'የሚጠበቅ ነገር የለም — ዝምታውን ይደሰቱ።',
    missedRecently: 'ያመለጡ',
    attention: 'ትኩረት',
    comingUp: 'የሚመጣ',
    completedWeek: 'ኃላፊነቶች በዚህ ሳምንት ተጠናቀዋል።',
    upForGrabs: 'ለሁሉም ክፍት',
  },
  chores: {
    title: 'ሥራዎች',
    mine: 'የኔ',
    everyone: 'ሁሉም',
    overdue: 'የዘገየ',
    allClear: 'ሁሉም ንጹሕ',
    allClearHint: 'እዚህ ምንም የለም — እያለ ይደሰቱ።',
    newChore: 'አዲስ ሥራ',
    choreTitle: 'ርዕስ',
    repeats: 'ይደገማል',
    once: 'አንድ ጊዜ ብቻ',
    daily: 'በየቀኑ',
    weekly: 'በየሳምንቱ',
    monthly: 'በየወሩ',
    assignedTo: 'ለማን (ባዶ = ለሁሉም ክፍት)',
    addChore: 'ሥራ ጨምር',
    adding: 'በመጨመር ላይ…',
    steps: 'ደረጃዎች',
    open: 'ክፍት',
    notFound: 'ሥራው አልተገኘም',
    notFoundHint: 'ምናልባት ተደምስሷል።',
    backToChores: 'ወደ ሥራዎች ተመለስ',
    complete: 'ጨርስ',
    completeAria: 'ጨርስ፦ {{title}}',
    scope: 'የሥራ ወሰን',
    due: 'የሚጠበቅበት {{date}}',
    titlePlaceholder: 'መጣጥን አውጣ',
    updatedToast: '{{title}} ተዘምኗል።',
    alreadyHandled: 'አስቀድሞ ተከናውኗል — ዝርዝሩ ተባስቷል።',
  },
  household: {
    title: 'ቤተሰብ',
    roles: 'ሚናዎች',
    finished: 'የተጠናቀቀ',
    missed: 'የቀረ',
    previewAs: 'ቅድመ-እይታ እንደ',
    removePerson: 'ሰው አስወግድ',
    familyRoles: 'የቤተሰብ ሚናዎች',
    resetExplain: 'ዳግም-አስጀምር ለተገነቡት የፋብሪካ ነባሪዎችን ይመልሳል፣ ለብጁ ሚናዎች ደግሞ የፍጠራ ቅጽበታዊውን።',
    newRole: 'አዲስ የሚና ስም',
    noRole: 'ሚና የለም',
    owner: 'ባለቤት',
    roleLabel: 'ሚና',
    profileUpdated: 'መገለጫ ተዘምኗል።',
    permissionsReset: 'ፍቃዶች ወደ ነባሪ ተመልሰዋል።',
    builtinPreset: 'የተካተተ ሚና',
    customRole: 'ብጁ ሚና',
    permissionsCount: '{{count}} ፍቃዶች',
    reset: 'ዳግም አስጀምር',
    saveName: 'ስም አስቀምጥ',
    previewAsName: 'እንደ {{name}} ቅድመ-እይታ',
    removeConfirm: '{{name}} ን አስወግድ? መገለጫውና ክፍለ-ጊዜያቱም ይሰረዛሉ — ታሪኩ ስሙን ይጠብቃል።',
    keep: 'አቆይ',
    personRemovedToast: '{{name}} ተነሷል።',
  },
  ops: {
    routines: 'ሥርዓቶች',
    routinesHint: 'ሥራዎችን የሚያደራጁ መያዣዎች — እነርሱ ራሳቸው ምንም አይያዙም።',
    home: 'ቤት',
    rooms: 'ክፍሎች',
    assets: 'ንብረቶች',
    supplies: 'ቁሳቁሶች',
    shopping: 'ግዢያ',
    listEmpty: 'ዝርዝሩ ባዶ ነው',
    supplyAvailable: 'አለ',
    supplyLow: 'በመቀነስ ላይ',
    supplyOut: 'አልቋል',
    dueDate: 'የሚጠበቅበት {{date}}',
    buy: 'ግዛ',
    buyAria: 'ግዛ፦ {{name}}',
    addItem: 'ዕቃ ጨምር',
    bought: 'የተገዛ ({{count}})',
    shoppingEmptyHint: 'የሚቀንስ ነገር አለ? እዚህ ይጨምሩ።',
    newSupply: 'አዲስ ቁሳቁስ',
    newRoutine: 'አዲስ ሥርዓት',
    organizationalOnly: 'ለማደራጀት ብቻ',
    assetsCount: '{{count}} ንብረቶች',
    newRoom: 'አዲስ ክፍል',
    newAsset: 'አዲስ ንብረት',
    roomOptional: 'ክፍል (አማራጭ)',
    noRoom: 'ክፍል የለም',
    addAsset: 'ንብረት ጨምር',
    markAria: '{{name}} ን እንደ {{state}} አስቀምጥ',
    serviceLogged: 'አገልግሎት ተመዝግቧል።',
    itemPlaceholder: 'ሩዝ',
    supplyPlaceholder: 'ሳሙና',
    roomPlaceholder: 'ኩሽና',
    assetPlaceholder: 'የልብስ ማጠቢያ',
    routinePlaceholder: 'ጠዋት',
  },
  activity: {
    title: 'እንቅስቃሴ',
    quiet: 'አሁን ዝምታ ነው',
    quietHint: 'የቤተሰብ ታሪኮች እዚህ ይታያሉ።',
    filterLabel: 'በአባል ያጣራ (አማራጭ)',
    occurrenceCompleted: '{{title}} ተጠናቋል።',
    occurrenceMissed: '{{title}} ተረስኗል።',
    occurrenceSkipped: '{{title}} ተዝሏል።',
    personAdded: '{{name}} ወደ ቤተሰቡ ተቀላቅሏል።',
    responsibilityCreated: '{{title}} ተጨምሯል።',
    itemPurchased: '{{title}} ተገዝቷል።',
  },
  notify: {
    title: 'ማሳወቂያዎች',
    caughtUp: 'ሁሉም ተጠናቋል',
    readAll: 'ሁሉንም አንብብ',
    whatToReceive: 'ምን እንደሚደርስዎ',
    reminderDigest: '{{count}} ዛሬ የሚጠበቁ — ለመክፈት ይንኩ።',
    completionRecorded: '{{title}} ተጠናቋል።',
    missedDetected: '{{title}} ተረስኗል።',
    backupNudge: '{{name}} ን ያስቀምጡ — ቅጂ ይቆጥቡ።',
    caughtUpHint: 'አስታዋሾችና ዜናዎች እዚህ ይደርሳሉ።',
    prefsAria: 'ምርጫዎች',
    categoryAria: '{{category}} ማሳወቂያዎች',
    on: 'በርቷል',
    off: 'ጠፍቷል',
    catAssignment: 'ምደባዎች',
    catReminder: 'አስታዋሾች',
    catCompletion: 'የተጠናቀቁ',
    catMissed: 'የቀሩ',
    catFinance: 'ፋይናንስ',
    catBill: 'ክፍያዎች',
    catBackup: 'ምትኬ',
  },
  settings: {
    title: 'ቅንብሮች',
    language: 'ቋንቋ',
    theme: 'ገጽታ',
    calendar: 'የቀን መቁጠሪያ',
    household: 'ቤተሰብ',
    backup: 'ምትኬ',
    saveCopy: 'የቤተሰብ ቅጂ አስቀምጥ',
    openCopy: 'የቤተሰብ ቅጂ ክፈት',
    signOut: 'ውጣ',
    gregorian: 'ግሩጎርያን',
    ethiopian: 'ኢትዮጵያዊ',
    both: 'ሁለቱም',
    codeShare: 'ኮድ {{code}} — በሌላ መገለጫ ለመግባት ያጋሩ።',
    exportSaved: 'የቤተሰብ ቅጂ ተቀምጧል።',
    exportFailed: 'ማስቀመጥ አልተሳካም — እንደገና ይሞክሩ።',
    importOpened: 'የቤተሰብ ቅጂ ተከፍቷል።',
    importBlocked: 'ማምጣት ታግዷል — ምንም አልተቀየረም።',
    noPasswords: 'የቤተሰብ ቅጂዎች ምንም የይለፍ ቃል አያካትቱም።',
    themeFamily: 'ቤተሰብ',
    themeEmber: 'እሳት',
    themeHighland: 'ከፍታ',
  },
  print: {
    title: 'ሳምንቱን አትም',
    signInToPrint: 'ለማተም ይግቡ',
    printHint: 'የሳምንት ወረቀቶች ከቤተሰብዎ ይታተማሉ።',
    printBtn: 'አትም',
    customize: 'አስተካክል',
    prevWeek: '← ያለፈ ሳምንት',
    nextWeek: 'ቀጣይ ሳምንት →',
    membersAria: 'አባላት',
    checkboxes: 'ምልክት ሳጥኖች',
    nothingScheduled: 'በዚህ ሳምንት ምንም አልተሰማራም።',
  },
  onboarding: {
    languageTitle: 'Language / ቋንቋ',
    householdTitle: 'ቤተሰብዎ',
    changeLater: 'በኋላ መቀየር ይችላሉ።',
    householdName: 'የቤተሰብ ስም',
    yourName: 'ስምዎ',
    continue: 'ቀጥል',
    addPeople: 'ሰዎችን ይጨምሩ',
    addPeopleHint: 'ማንኛውም ሰው በኋላም ሊጨመር ይችላል።',
    personNameAria: 'የሰው {{index}} ስም',
    personRoleAria: 'የሰው {{index}} ሚና',
    addAnother: '+ ሌላ ይጨምሩ',
    settingUp: 'በማዘጋጀት ላይ…',
    start: 'ጀምር',
    householdPlaceholder: 'የበከለ ቤተሰብ',
    ownerPlaceholder: 'ሃና',
    roleMother: 'እናት',
    roleFather: 'አባት',
    roleGuardian: 'አስጠኚ',
    roleAdult: 'አዋቂ',
    roleTeenager: 'ወጣት',
    roleResponsibleChild: 'ኃላፊነት የሚሰማው ልጅ',
    roleChild: 'ልጅ',
    roleSupervisedChild: 'ቁጥጥር የሚደረግበት ልጅ',
    roleFamilyMember: 'የቤተሰብ አባል',
  },
};

export type Locale = 'en' | 'am';
export const LOCALES: Locale[] = ['en', 'am'];
export const LANGUAGE_STORAGE_KEY = 'chorify-language';
