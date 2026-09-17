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
    days: string;
    weeks: string;
  };
  nav: {
    today: string;
    chores: string;
    duties: string;
    pantry: string;
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
    orContinueWith: string;
    googleButton: string;
    googleFinishing: string;
    googleFailed: string;
    backToLogin: string;
    switchProfile: string;
    switchProfileAria: string;
    passwordFor: string;
    wrongPassword: string;
    differentCode: string;
    pickYourFace: string;
    whoAreYou: string;
    codeNotFound: string;
    enterCodeTitle: string;
    continueLabel: string;
    notYou: string;
    useCodeInstead: string;
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
    every_n_days: string;
    weekly: string;
    every_n_weeks: string;
    monthly: string;
    range: string;
    dates: string;
    icon: string;
    startDate: string;
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
    intervalDays: string;
    intervalWeeks: string;
    daysOfWeek: string;
    monthlyDay: string;
    endDate: string;
    rotation: string;
    rotationPeriod: string;
    addStep: string;
    stepPlaceholder: string;
    nextUp: string;
    assignAgain: string;
    reassign: string;
    reassignTitle: string;
    reassignHint: string;
    claim: string;
    assignedToShort: string;
    history: string;
    historyAll: string;
    statusCompleted: string;
    statusSkipped: string;
    statusMissed: string;
    takenBy: string;
    dow0: string;
    dow1: string;
    dow2: string;
    dow3: string;
    dow4: string;
    dow5: string;
    dow6: string;
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
    finishedWeek: string;
    finishedMonth: string;
    trend8w: string;
    breakdown: string;
    printWeekly: string;
    boundarySentence: string;
    customizePermissions: string;
    changePassword: string;
    createAccount: string;
    permissionsHint: string;
  };
  perms: {
    domains: {
      household: string;
      responsibilities: string;
      finances: string;
      home: string;
      resources: string;
    };
    household: {
      view_people: string;
      add_people: string;
      invite_people: string;
      remove_people: string;
      manage_roles: string;
      manage_ownership: string;
      configure_permissions: string;
    };
    responsibilities: {
      view: string;
      create: string;
      assign: string;
      reassign: string;
      manage_routines: string;
      complete: string;
      view_history: string;
    };
    finances: {
      view: string;
      view_expenses: string;
      create_expenses: string;
      edit_expenses: string;
      view_accounts: string;
      manage_accounts: string;
      view_budgets: string;
      manage_budgets: string;
      manage_goals: string;
    };
    home: {
      view_assets: string;
      manage_assets: string;
      manage_maintenance: string;
    };
    resources: {
      manage_supplies: string;
      manage_shopping: string;
      manage_purchases: string;
    };
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
    routineAdded: string;
    shoppingItemAdded: string;
    shoppingBought: string;
    roomAdded: string;
    assetAdded: string;
    supplyAdded: string;
    taskCompletedFallback: string;
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
  setup: {
    title: string;
    hint: string;
  };
  lock: {
    title: string;
    subtitle: string;
    passcode: string;
    wrong: string;
    hintLabel: string;
    unlock: string;
    recoverOnline: string;
    recoverWarning: string;
  };
  cal: {
    m1: string;
    m2: string;
    m3: string;
    m4: string;
    m5: string;
    m6: string;
    m7: string;
    m8: string;
    m9: string;
    m10: string;
    m11: string;
    m12: string;
    m13: string;
  };
  settings: {
    title: string;
    language: string;
    security: string;
    securityHint: string;
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
    importConflict: string;
    importTooNew: string;
    noPasswords: string;
    passcode: string;
    passcodeOn: string;
    passcodeNew: string;
    passcodeConfirm: string;
    passcodeHint: string;
    passcodeSave: string;
    passcodeSaved: string;
    passcodeRemove: string;
    passcodeRemoveConfirm: string;
    passcodeRemoved: string;
    passcodeTooShort: string;
    passcodeMismatch: string;
    passcodeExplainSynced: string;
    passcodeExplainOffline: string;
    passcodeNeedsDurable: string;
    themeSky: string;
    themePeach: string;
    themeCaramel: string;
    themeMint: string;
    themeButter: string;
    themeRose: string;
  };
  themePreview: {
    title: string;
    subtitle: string;
    themes: string;
    surfaces: string;
    cardWash: string;
    actions: string;
    tasks: string;
    backToApp: string;
  };
  facts: {
    title: string;
    sex: string;
    male: string;
    female: string;
    maleAdult: string;
    femaleAdult: string;
    birthDate: string;
    age: string;
    agePlaceholder: string;
    ageHint: string;
  };
  switcher: {
    inUse: string;
    hasPin: string;
  };
  role: {
    father: string;
    mother: string;
    grandfather: string;
    grandmother: string;
    guardian: string;
    adult: string;
    teenager: string;
    responsible_child: string;
    child: string;
    supervised_child: string;
    family_member: string;
  };
  pantry: {
    title: string;
    subtitle: string;
    runningOut: string;
    stockedHint: string;
    boughtIt: string;
    runningLowCta: string;
    toShopping: string;
    shopping: string;
    stocked: string;
    noSupplies: string;
    deadlines: string;
    upcoming: string;
    cycleFacts: string;
    outFacts: string;
    noFactsYet: string;
  };
  family: {
    title: string;
    subtitle: string;
    today: string;
    done: string;
    missed: string;
    filterAll: string;
    filterMine: string;
    viewFull: string;
    emptyToday: string;
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
  sync: {
    syncing: string;
    savedLocal: string;
    offlineSaved: string;
    pending: string;
    staleWarn: string;
    staleStrong: string;
    staleResync: string;
    signUpNudge: string;
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
    days: 'days',
    weeks: 'weeks',
  },
  nav: {
    today: 'Today',
    chores: 'Chores',
    duties: 'Duties',
    pantry: 'Pantry',
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
    family: 'Family',
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
    orContinueWith: 'or',
    googleButton: 'Continue with Google',
    googleFinishing: 'Signing you in',
    googleFailed: 'Google sign-in did not go through. Try again, or use your household code.',
    backToLogin: 'Back to sign in',
    switchProfile: 'Switch profile',
    switchProfileAria: 'Switch profile (currently {{name}})',
    passwordFor: 'Password for {{name}}',
    wrongPassword: 'Wrong password — try again.',
    differentCode: 'Use a different code',
    pickYourFace: 'Who are you?',
    whoAreYou: 'Tap your face to sign in — no typing needed.',
    codeNotFound: 'No household carries this code yet. Check it and try again.',
    enterCodeTitle: 'Enter your household code',
    continueLabel: 'Continue',
    notYou: 'Not {{name}}?',
    useCodeInstead: 'Type code instead',
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
    every_n_days: 'Every N days',
    weekly: 'Every week',
    every_n_weeks: 'Every N weeks',
    monthly: 'Every month',
    range: 'Daily until…',
    dates: 'On chosen dates',
    icon: 'Icon',
    startDate: 'Starting',
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
    intervalDays: 'Every {{n}} days',
    intervalWeeks: 'Every {{n}} weeks',
    daysOfWeek: 'On days',
    monthlyDay: 'Day of month',
    endDate: 'Until (optional)',
    rotation: 'Rotate between people',
    rotationPeriod: 'Rotates every {{n}} days',
    addStep: 'Add step',
    stepPlaceholder: 'Step description',
    nextUp: 'Next up',
    assignAgain: 'Assign again',
    reassign: 'Reassign',
    reassignTitle: 'This week only',
    reassignHint: 'Moves this occurrence only — the weekly plan stays as is.',
    claim: 'Take this',
    assignedToShort: 'Assigned: {{who}}',
    history: 'History',
    historyAll: 'Show all',
    statusCompleted: 'Completed {{date}}',
    statusSkipped: 'Skipped {{date}}',
    statusMissed: 'Missed ({{date}})',
    takenBy: 'taken by {{who}}',
    dow0: 'Sun',
    dow1: 'Mon',
    dow2: 'Tue',
    dow3: 'Wed',
    dow4: 'Thu',
    dow5: 'Fri',
    dow6: 'Sat',
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
    finishedWeek: 'this week',
    finishedMonth: 'this month',
    trend8w: 'Last 8 weeks',
    breakdown: 'Most completed',
    printWeekly: 'Print weekly sheet',
    boundarySentence:
      '{{name}} can do everything a {{role}} can — except what is marked ● below.',
    customizePermissions: 'Customize permissions',
    changePassword: 'Change password',
    createAccount: 'Create account',
    permissionsHint: 'Switches start from the role. Toggling twice returns to the role default.',
  },
  perms: {
    domains: {
      household: 'Household',
      responsibilities: 'Chores',
      finances: 'Money',
      home: 'Home',
      resources: 'Supplies & shopping',
    },
    household: {
      view_people: 'See people',
      add_people: 'Add people',
      invite_people: 'Invite by code',
      remove_people: 'Remove people',
      manage_roles: 'Manage roles',
      manage_ownership: 'Manage ownership',
      configure_permissions: 'Configure permissions',
    },
    responsibilities: {
      view: 'See chores',
      create: 'Create chores',
      assign: 'Assign',
      reassign: 'Reassign',
      manage_routines: 'Manage routines',
      complete: 'Complete',
      view_history: 'See history',
    },
    finances: {
      view: 'See money',
      view_expenses: 'See expenses',
      create_expenses: 'Add expenses',
      edit_expenses: 'Edit expenses',
      view_accounts: 'See accounts',
      manage_accounts: 'Manage accounts',
      view_budgets: 'See budgets',
      manage_budgets: 'Manage budgets',
      manage_goals: 'Manage goals',
    },
    home: {
      view_assets: 'See assets',
      manage_assets: 'Manage assets',
      manage_maintenance: 'Manage maintenance',
    },
    resources: {
      manage_supplies: 'Manage supplies',
      manage_shopping: 'Manage shopping',
      manage_purchases: 'Mark purchases',
    },
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
    routineAdded: '{{name}} added.',
    shoppingItemAdded: '{{name}} added to shopping.',
    shoppingBought: 'Bought {{name}} — supply refilled.',
    roomAdded: '{{name}} added.',
    assetAdded: '{{name}} added.',
    supplyAdded: '{{name}} added.',
    taskCompletedFallback: 'Task completed.',
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
  setup: {
    title: 'Household setup',
    hint: 'Everything about how your home runs — you can change this later.',
  },
  lock: {
    title: 'Locked',
    subtitle: 'Enter this device’s passcode to continue.',
    passcode: 'Passcode',
    wrong: 'Wrong passcode — try again.',
    hintLabel: 'Hint: {{hint}}',
    unlock: 'Unlock',
    recoverOnline: 'Sign in online to reset the passcode',
    recoverWarning: 'Offline-only household? Resetting erases data on this device.',
  },
  cal: {
    m1: 'Meskerem',
    m2: 'Tikimt',
    m3: 'Hidar',
    m4: 'Tahsas',
    m5: 'Tir',
    m6: 'Yekatit',
    m7: 'Megabit',
    m8: 'Miazia',
    m9: 'Ginbot',
    m10: 'Sene',
    m11: 'Hamle',
    m12: 'Nehase',
    m13: 'Pagume',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    security: 'Security & privacy',
    securityHint: 'Passcode lock and privacy controls for this device.',
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
    importConflict:
      'Import blocked: this backup does not match this household. Nothing was changed.',
    importTooNew:
      'Import blocked: this backup was made on a newer version. Update the app first.',
    noPasswords: 'Household copies never include passwords.',
    passcode: 'Device passcode',
    passcodeOn: 'Passcode is on for this device.',
    passcodeNew: 'New passcode (4+ characters)',
    passcodeConfirm: 'Confirm passcode',
    passcodeHint: 'Hint (optional, shown on the lock screen)',
    passcodeSave: 'Turn on passcode',
    passcodeSaved: 'Passcode saved.',
    passcodeRemove: 'Remove passcode',
    passcodeRemoveConfirm: 'Remove passcode from this device?',
    passcodeRemoved: 'Passcode removed.',
    passcodeTooShort: 'Passcode must be at least 4 characters.',
    passcodeMismatch: 'Passcodes do not match.',
    passcodeExplainSynced:
      'Locks this app on this device. Forgot it? Sign in online and the passcode resets.',
    passcodeExplainOffline:
      'Locks this app on this device. This household is offline-only — forgetting the passcode means resetting the app and losing data on this device.',
    passcodeNeedsDurable:
      'This browser session has no durable storage, so a passcode cannot be saved. Open the app in Chrome, Edge, Safari or Firefox.',
    themeSky: 'Sky',
    themePeach: 'Peach',
    themeCaramel: 'Caramel',
    themeMint: 'Mint',
    themeButter: 'Butter',
    themeRose: 'Rose',
  },
  themePreview: {
    title: 'Theme studio',
    subtitle: 'Six pastel rooms — tap one to wear it.',
    themes: 'Themes',
    surfaces: 'Surfaces',
    cardWash: 'Soft gradient wash, hairline border, layered shadow.',
    actions: 'Actions',
    tasks: 'Task rows',
    backToApp: 'Back to the app',
  },
  facts: {
    title: 'About',
    sex: 'Girl or boy',
    male: 'Boy',
    female: 'Girl',
    maleAdult: 'Man',
    femaleAdult: 'Woman',
    birthDate: 'Birthday',
    age: 'Age',
    agePlaceholder: '—',
    ageHint: 'Pick the birthday, or just type the age.',
  },
  switcher: {
    inUse: 'In use',
    hasPin: 'PIN',
  },
  // Built-in role display names — keyed by the wire contract's builtinKey
  // (roles.rules.ts: "clients localize by builtinKey, never by stored text").
  role: {
    father: 'Father',
    mother: 'Mother',
    grandfather: 'Grandfather',
    grandmother: 'Grandmother',
    guardian: 'Guardian',
    adult: 'Adult',
    teenager: 'Teenager',
    responsible_child: 'Responsible Child',
    child: 'Child',
    supervised_child: 'Supervised Child',
    family_member: 'Family Member',
  },
  pantry: {
    title: 'Pantry',
    subtitle: 'What is running out, what to buy next, and dates to remember.',
    runningOut: 'Running out',
    stockedHint: 'Everything is stocked — nothing needs attention.',
    boughtIt: 'Bought it',
    runningLowCta: 'Almost out',
    toShopping: 'Add to shopping list',
    shopping: 'Shopping list',
    stocked: 'Stocked',
    noSupplies: 'No supplies yet — add the first one below.',
    deadlines: 'Dates to remember',
    upcoming: 'Upcoming',
    cycleFacts: 'Usually lasts about {{days}} · ran low {{cycles}}×',
    outFacts: 'Ran out {{out30}}× in the last month · {{out90}}× in 3 months',
    noFactsYet: 'Facts appear as you track it over time.',
  },
  family: {
    title: 'Family',
    subtitle: 'Who has what today — and how the week went.',
    today: 'Today',
    done: 'Done',
    missed: 'Missed',
    filterAll: 'Everyone',
    filterMine: 'Mine',
    viewFull: 'Full view',
    emptyToday: 'Nothing scheduled for today.',
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
  sync: {
    syncing: '↻ Syncing…',
    savedLocal: '✓ Saved on this device',
    offlineSaved: 'You are offline. Your changes are saved and will sync when you\u2019re back online.',
    pending: '{{count}} changes waiting to sync',
    staleWarn: 'It\u2019s been a while since this device synced. Reconnect when you can.',
    staleStrong: 'This device hasn\u2019t synced in a long time. Connect to keep the family in step.',
    staleResync: 'This device is out of date. Reconnect to bring everything back up to date.',
    signUpNudge: 'Create a free account so the whole family can share this household.',
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
    days: 'ቀናት',
    weeks: 'ሳምንታት',
  },
  nav: {
    today: 'ዛሬ',
    chores: 'ሥራዎች',
    duties: 'ተጠያቂነቶች',
    pantry: 'ማከማቻ',
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
    orContinueWith: 'ወይም',
    googleButton: 'በGoogle ግባ',
    googleFinishing: 'በመግባት ላይ',
    googleFailed: 'የGoogle መግቢያ አልተሳካም። እንደገና ይሞክሩ፣ ወይም የቤተሰብ ኮድዎን ይጠቀሙ።',
    backToLogin: 'ወደ መግቢያ ተመለስ',
    switchProfile: 'መገለጫ ቀይር',
    switchProfileAria: 'መገለጫ ቀይር (አሁን {{name}})',
    passwordFor: 'የ{{name}} የይለፍ ቃል',
    wrongPassword: 'የተሳሳተ የይለፍ ቃል — እንደገና ይሞክሩ።',
    differentCode: 'ሌላ ኮድ ይጠቀሙ',
    pickYourFace: 'ማን ነዎት?',
    whoAreYou: 'መግቢያዎን ለመጀመር ፊትዎን ይንኩ — መጻፍ አያስፈልግም።',
    codeNotFound: 'በዚህ ኮድ የሚገኝ ቤተሰብ የለም። ይፈትሹትና እንደገና ይሞክሩ።',
    enterCodeTitle: 'የቤተሰብ ኮድዎን ያስገቡ',
    continueLabel: 'ቀጥል',
    notYou: '{{name}} አይደሉትም?',
    useCodeInstead: 'ኮድ ይጻፉ',
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
    every_n_days: 'በየ N ቀኑ',
    weekly: 'በየሳምንቱ',
    every_n_weeks: 'በየ N ሳምንቱ',
    monthly: 'በየወሩ',
    range: 'ዕለት በዕለት እስከ…',
    dates: 'በተመረጡ ቀናት',
    icon: 'ምልክት',
    startDate: 'የሚጀምርበት',
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
    intervalDays: 'በየ {{n}} ቀኑ',
    intervalWeeks: 'በየ {{n}} ሳምንቱ',
    daysOfWeek: 'በቀናት ላይ',
    monthlyDay: 'የወሩ ቀን',
    endDate: 'እስከ (አማራጭ)',
    rotation: 'በሰዎች መካከል ማዞር',
    rotationPeriod: 'በየ {{n}} ቀኑ ይለዋወጣል',
    addStep: 'ደረጃ ጨምር',
    stepPlaceholder: 'የደረጃ መግለጫ',
    nextUp: 'ቀጥሎ ያለ',
    assignAgain: 'እንደገና መድብ',
    reassign: 'አሳዋር',
    reassignTitle: 'ለዚህ ሳምንብ ብቻ',
    reassignHint: 'ይህንን ቀን ብቻ ያሳውራል — የሳምንቱ ዕቅድ እንደነበረ ይቀራል።',
    claim: 'ያዝበት',
    assignedToShort: 'የተመደበ፦ {{who}}',
    history: 'ታሪክ',
    historyAll: 'ሁሉንም አሳይ',
    statusCompleted: 'የተጠናቀቀ {{date}}',
    statusSkipped: 'የተዘለለ {{date}}',
    statusMissed: 'ያለፈበት ({{date}})',
    takenBy: '{{who}} ያዝበት',
    dow0: 'እሁድ',
    dow1: 'ሰኞ',
    dow2: 'ማክሰኞ',
    dow3: 'ረቡዕ',
    dow4: 'ሐሙስ',
    dow5: 'ዓርብ',
    dow6: 'ቅዳሜ',
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
    finishedWeek: 'በዚህ ሳምንት',
    finishedMonth: 'በዚህ ወር',
    trend8w: 'የመጨረሻዎቹ 8 ሳምንታት',
    breakdown: 'ብዙ የተጠናቀቁ',
    printWeekly: 'የሳምንቱን ወረቀት አትም',
    boundarySentence: '{{name}} እንደ {{role}} ማድረግ የሚችል ሁሉ ይችላል — ከሚታየው ● በስተቀር።',
    customizePermissions: 'ፍቃዶችን ማስተካከል',
    changePassword: 'የይለፍ ቃል ቀይር',
    createAccount: 'መለያ ፍጠር',
    permissionsHint: 'ማብሪያዎቹ ከሚናው ይጀምራሉ። ሁለት ጊዜ መጫን ወደ ሚናው ነባሪ ይመልሳል።',
  },
  perms: {
    domains: {
      household: 'ቤተሰብ',
      responsibilities: 'ተጠያቂነቶች',
      finances: 'ገንዘብ',
      home: 'ቤት',
      resources: 'እቃዎችና ግዢያ',
    },
    household: {
      view_people: 'ሰዎችን ማየት',
      add_people: 'ሰው መጨመር',
      invite_people: 'በኮድ መጋበዝ',
      remove_people: 'ሰው ማስወጣት',
      manage_roles: 'ሚናዎችን አስተዳደር',
      manage_ownership: 'ባለቤትነት አስተዳደር',
      configure_permissions: 'ፍቃዶችን ማስተካከል',
    },
    responsibilities: {
      view: 'ተጠያቂነቶችን ማየት',
      create: 'ተጠያቂነት መፍጠር',
      assign: 'መመደብ',
      reassign: 'እንደገና መመደብ',
      manage_routines: 'ሥርዓቶችን አስተዳደር',
      complete: 'ማጠናቀቅ',
      view_history: 'ታሪክ ማየት',
    },
    finances: {
      view: 'ገንዘብ ማየት',
      view_expenses: 'ወጪዎችን ማየት',
      create_expenses: 'ወጪ መጨመር',
      edit_expenses: 'ወጪ ማስተካከል',
      view_accounts: 'ሂሳቦችን ማየት',
      manage_accounts: 'ሂሳቦችን አስተዳደር',
      view_budgets: 'በጀቶችን ማየት',
      manage_budgets: 'በጀቶችን አስተዳደር',
      manage_goals: 'ግቦችን አስተዳደር',
    },
    home: {
      view_assets: 'ንብረቶችን ማየት',
      manage_assets: 'ንብረቶችን አስተዳደር',
      manage_maintenance: 'ጥገና አስተዳደር',
    },
    resources: {
      manage_supplies: 'እቃዎችን አስተዳደር',
      manage_shopping: 'ግዢያ አስተዳደር',
      manage_purchases: 'ግዢያ መጨረስ',
    },
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
    routineAdded: '{{name}} ተጨምሯል።',
    shoppingItemAdded: '{{name}} ወደ ግዢያ ተጨምሯል።',
    shoppingBought: '{{name}} ተገዝቷል — እቃው ተሞልቷል።',
    roomAdded: '{{name}} ተጨምሯል።',
    assetAdded: '{{name}} ተጨምሯል።',
    supplyAdded: '{{name}} ተጨምሯል።',
    taskCompletedFallback: 'ተግባሩ ተጠናቋል።',
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
  setup: {
    title: 'የቤተሰብ ዝግጅት',
    hint: 'ቤታችሁን የሚያስኬድ ሁሉ — በኋላ መቀየር ይችላሉ።',
  },
  lock: {
    title: 'ተዘግቷል',
    subtitle: 'ለመቀጠል የዚህን መሣሪያ የይለፍ ቃል ያስገቡ።',
    passcode: 'የይለፍ ቃል',
    wrong: 'ተሳስቷል — እንደገና ይሞክሩ።',
    hintLabel: 'ፍንጭ፦ {{hint}}',
    unlock: 'ክፈት',
    recoverOnline: 'የይለፍ ቃሉን ለማሳረስ በመስመር ላይ ይግቡ',
    recoverWarning: 'መሣሪያው ብቻውን የሚሰራ ቤተሰብ ከሆነ፦ ማሳረስ በዚህ መሣሪያ ላይ ያለውን መረጃ ይሰርዛል።',
  },
  cal: {
    m1: 'መስከረም',
    m2: 'ጥቅምት',
    m3: 'ኅዳር',
    m4: 'ታኅሣሥ',
    m5: 'ጥር',
    m6: 'የካቲት',
    m7: 'መጋቢት',
    m8: 'ሚያዝያ',
    m9: 'ግንቦት',
    m10: 'ሰኔ',
    m11: 'ሐምሌ',
    m12: 'ነሐሴ',
    m13: 'ጳጉሜን',
  },
  settings: {
    title: 'ቅንብሮች',
    language: 'ቋንቋ',
    security: 'ደህንነትና ግላዊነት',
    securityHint: 'የመሣሪያ መቆለፊያና የግላዊነት መቆጣጠሪያዎች።',
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
    importConflict: 'ማምጣት ታግዷል፦ ይህ መጠባበቂያ ከዚህ ቤተሰብ ጋር አይሚሱም። ምንም አልተቀየረም።',
    importTooNew: 'ማምጣት ታግዷል፦ ይህ መጠባበቂያ በአዲስ ስሪት ተሠርቷል። መጀመሪያ መተግበሪያውን ያዘምኑ።',
    noPasswords: 'የቤተሰብ ቅጂዎች ምንም የይለፍ ቃል አያካትቱም።',
    passcode: 'የመሣሪያ የይለፍ ቃል',
    passcodeOn: 'በዚህ መሣሪያ ላይ የይለፍ ቃል በርቷል።',
    passcodeNew: 'አዲስ የይለፍ ቃል (4+ ፊደላት)',
    passcodeConfirm: 'ያረጋግጡ',
    passcodeHint: 'ፍንጭ (አማራጭ፣ በመቆለፊያ ስክሪኑ ላይ ይታያል)',
    passcodeSave: 'የይለፍ ቃል አብራ',
    passcodeSaved: 'የይለፍ ቃል ተቀምጧል።',
    passcodeRemove: 'የይለፍ ቃል አጥፋ',
    passcodeRemoveConfirm: 'ከዚህ መሣሪያ የይለፍ ቃል ይወገድ?',
    passcodeRemoved: 'የይለፍ ቃል ተወግዷል።',
    passcodeTooShort: 'የይለፍ ቃል ቢያንስ 4 ፊደላት መሆን አለበት።',
    passcodeMismatch: 'የይለፍ ቃሎቹ አይመሳሰሉም።',
    passcodeExplainSynced: 'መቆለፊያው የሚሠራው በዚህ መሣሪያ ላይ ነው። ረስተዋል? በመስመር ላይ ሲገቡ የይለፍ ቃሉ ይሳረሳል።',
    passcodeExplainOffline:
      'መቆለፊያው የሚሠራው በዚህ መሣሪያ ላይ ነው። ይህ ቤተሰብ መሣሪያውን ብቻ ይጠቀማል — ረስተዋል? መተግበሪያውን ማሳረስ ብቻ ነው፤ መረጃው ይጠፋል።',
    passcodeNeedsDurable:
      'በዚህ አሳሽ ክፍለ-ጊዜ ዘላቂ ማከማቻ የለም፤ ስለዚህ የይለፍ ቃል ሊቀመጥ አይችልም። መተግበሪያውን በChrome፣ Edge፣ Safari ወይም Firefox ይክፈቱ።',
    themeSky: 'ሰማይ',
    themePeach: 'ፑች',
    themeCaramel: 'ካራመል',
    themeMint: 'ሚንት',
    themeButter: 'በተር',
    themeRose: 'ሮዝ',
  },
  themePreview: {
    title: 'የገጽታ ክፍል',
    subtitle: 'ስድስት የቀለም ክፍያዎች — አንዱን ተጫን።',
    themes: 'ገጽታዎች',
    surfaces: 'ስርዓቶች',
    cardWash: 'ለስላሳ የቀለም መሸጋገሪያ፣ ደካማ ወሰን፣ ሶፍት ጥላ።',
    actions: 'እርምጃዎች',
    tasks: 'የተግባር ረድፎች',
    backToApp: 'ወደ መተግበሪያው ተመለስ',
  },
  facts: {
    title: 'ስለ ሰውየው',
    sex: 'ልጅ ወይስ የወንድ',
    male: 'ወንድ',
    female: 'ሴት',
    maleAdult: 'ወንድ',
    femaleAdult: 'ሴት',
    birthDate: 'የልደት ቀን',
    age: 'እድሜ',
    agePlaceholder: '—',
    ageHint: 'የልደት ቀኑን ይምረጡ፣ ወይም እድሜውን ብቻ ይጻፉ።',
  },
  switcher: {
    inUse: 'እየተጠቀመ ነው',
    hasPin: 'ኮድ',
  },
  role: {
    father: 'አባት',
    mother: 'እናት',
    grandfather: 'አያት (ወንድ)',
    grandmother: 'አያት (ሴት)',
    guardian: 'አስጠኚ',
    adult: 'አዋቂ',
    teenager: 'ወጣት',
    responsible_child: 'ኃላፊነት የሚሰማው ልጅ',
    child: 'ልጅ',
    supervised_child: 'ቁጥጥር የሚደረግበት ልጅ',
    family_member: 'የቤተሰብ አባል',
  },
  pantry: {
    title: 'ማከማቻ',
    subtitle: 'ምን እየጨረሰ ነው፣ ምን መግዛት እንዳለበት እና መታሠቢያ ቀኖች።',
    runningOut: 'እየጨረሰ ነው',
    stockedHint: 'ሁሉም ነገር በቂ ነው — የሚታይ ነገር የለም።',
    boughtIt: 'ገዛሁት',
    runningLowCta: 'አልቋል',
    toShopping: 'ወደ ግዢ ዝርዝር ጨምር',
    shopping: 'የግዢ ዝርዝር',
    stocked: 'የቀሩ',
    noSupplies: 'እስካሁን ምንም እቃ አልታከለም — ከታች የመጀመሪያውን ይጨምሩ።',
    deadlines: 'መታሠቢያ ቀኖች',
    upcoming: 'ቅርብ',
    cycleFacts: 'በአሂዝ ወደ {{days}} ይቆያል · {{cycles}} ጊዜ አልቧል',
    outFacts: 'ባለፈው ወር {{out30}} ጊዜ · በ3 ወር ውስጥ {{out90}} ጊዜ አልቧል',
    noFactsYet: 'በጊዜ ሂደት ስትከታተሉት መረጃዎች ይታያሉ።',
  },
  family: {
    title: 'ቤተሰብ',
    subtitle: 'የዛሬ ማን ምን እንዳለበት — እና ሳምንቱ እንዴት እንደፈሰ።',
    today: 'የዛሬ',
    done: 'የተጠናቀቁ',
    missed: 'ያለፉ',
    filterAll: 'ሁሉም',
    filterMine: 'የኔ',
    viewFull: 'ሙሉ እይታ',
    emptyToday: 'ዛሬ የተሰማራ ተግባር የለም።',
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
  sync: {
    syncing: '↻ እንደገና በማመሳሰል ላይ…',
    savedLocal: '✓ በመሣሪያዎ ላይ ተቀምጧል',
    offlineSaved: 'ከመስመር ውጭ ነዎት። ለውጦችዎ ተቀምጠዋል፣ መስመር ላይ ሲመለሱ ይመሳሰላሉ።',
    pending: '{{count}} ለውጦች ለማመሳሰል በመጠበቅ ላይ',
    staleWarn: 'ይህ መሣሪያ ለዘመን አልተመሳሰለም። መስመር ላይ ሲገቡ ያመሳስሉ።',
    staleStrong: 'ይህ መሣሪያ ለረዥም ጊዜ አልተመሳሰለም። ቤተሰቡ አብሮ እንዲኖር መስመር ላይ ይግቡ።',
    staleResync: 'ይህ መሣሪያ በጣም ወጅቷል። ሁሉንም እንደገና ለማመሳሰል መስመር ላይ ይግቡ።',
    signUpNudge: 'ሙሉ ቤተሰብ ይህን ቤተሰብ እንዲጋራ ነጻ መለያ ይፍጠሩ።',
  },
};

export type Locale = 'en' | 'am';
export const LOCALES: Locale[] = ['en', 'am'];
export const LANGUAGE_STORAGE_KEY = 'chorify-language';
