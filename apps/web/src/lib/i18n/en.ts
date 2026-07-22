import type { Locale } from './types';

/** Key-based UI translations */
export const en: Record<string, string> = {
  // Nav
  'nav.home': 'Home',
  'nav.course': 'Course Mode',
  'nav.explore': 'Explore',
  'nav.assets': 'My Library',
  'nav.pmApps': 'My AI Apps',
  'nav.projects': 'My Web Pages',
  'nav.settings': 'Settings',
  'nav.followClass': 'Follow Class',
  'nav.courseShort': 'Course',
  'nav.assetsShort': 'Library',

  // Shell
  'shell.studentDesk': 'Student Desk',
  'shell.padFollow': 'Tablet Class',
  'shell.padTitle': 'AI Camp Tablet',
  'shell.logout': 'Log Out',
  'shell.logoutFull': 'Log Out',
  'shell.expandSidebar': 'Expand sidebar',
  'shell.collapseSidebar': 'Collapse sidebar',
  'shell.classLocked': 'Class Locked',
  'shell.classLockedHint': 'Follow the teacher\'s screen — you can\'t browse other pages for now.',
  'shell.current': 'Now:',
  'shell.inClass': 'In Class',
  'shell.followingTeacher': 'Following Teacher',
  'shell.role.student': 'Student',
  'shell.role.teacher': 'Teacher',
  'shell.role.parent': 'Parent',
  'shell.role.admin': 'Admin',

  // Classroom bar
  'classroom.locked': '🔒 Class locked:',
  'classroom.active': '🎓 In class:',
  'classroom.return': '↩️ Back to Class',
  'classroom.following': 'Following Teacher',
  'classroom.inProgress': 'In Class',
  'classroom.waitTeacher': 'Waiting for teacher',
  'classroom.miniGame': 'Mini Game',
  'classroom.interactiveSlides': 'Interactive Slides',
  'classroom.slides': 'Slides',
  'classroom.page': 'Page',
  'classroom.workOf': '\'s Work',

  // Game shell
  'game.backToMap': '🏠 Back to Course Map',
  'game.backToLesson': '⬅️ Back to Lesson',
  'game.lockedHint': '🔒 Class is on — finish this step and stay on this page.',
  'game.defaultTitle': 'Mini Game',
  'game.prev': 'Previous',
  'game.next': 'Next Game',
  'game.allDone': '🎉 All done · Back to Course Map',
  'game.comingSoon': '(Coming Soon)',

  // Student home
  'home.greet.late': 'It\'s late — time to rest!',
  'home.greet.early': 'Good morning',
  'home.greet.noon': 'Good afternoon',
  'home.greet.afternoon': 'Good afternoon',
  'home.greet.evening': 'Good evening',
  'home.greet.default': 'Keep going today!',
  'home.welcome': 'Welcome back,',
  'home.subtitle': 'Follow the course or create freely in Explore — all works go to your library and web pages.',
  'home.courseBadge': 'Recommended · Learn step by step',
  'home.courseTitle': '📚 Course Mode',
  'home.courseDesc': '6 lessons from meeting AI to building your own portfolio.',
  'home.courseCta': 'Start the adventure →',
  'home.exploreBadge': 'Free Explore · Play what you like',
  'home.exploreTitle': '🎧 Explore Mode',
  'home.exploreDesc': 'Writing, images, videos, image understanding, AI mini apps, and music — all here.',
  'home.exploreCta': 'Go explore →',
  'home.toolsTitle': '🎧 Explore · Creative Tools',
  'home.viewAll': 'View all →',
  'home.startCreate': 'Start creating',
  'home.recentWorks': 'My Recent Works',
  'home.noWorks': 'No works yet — go make something!',
  'home.viewAllAssets': 'View all in library',
  'home.defaultName': 'Little Creator',

  // Course overview
  'course.badge': 'Course Mode · 6 Lessons',
  'course.title': 'AI Camp Adventure Map',
  'course.subtitle': 'Complete lessons one by one and make your own AI creations! Want free tools? Go to',
  'course.exploreLink': 'Explore Mode',
  'course.lesson': 'Lesson',
  'course.comingSoon': '(Coming Soon)',

  // Login
  'login.loading': 'Loading…',
  'login.padTitle': 'Tablet Class Login',
  'login.title': 'Welcome back!',
  'login.padSubtitle': 'Teachers use the tablet console, students follow on tablet ✨',
  'login.subtitle': 'Log in with the username and password your teacher gave you ✨',
  'login.apiDown': '⚠️ Backend not connected (port 3001). Open terminal in',
  'login.apiDownRun': 'folder and run',
  'login.apiDownThen': 'to start, then log in.',
  'login.username': '👤 Username',
  'login.password': '🔑 Password',
  'login.usernamePlaceholder': 'e.g. alice',
  'login.failed': 'Login failed',
  'login.submitting': 'Logging in…',
  'login.submit': '🚀 Let\'s go!',
  'login.backHome': '← Back to home',
  'login.tip': '💡 Tip: After login you can use AI to write, draw, and build web pages!',

  // Explore tools
  'tool.text': 'Writing',
  'tool.textDesc': 'Stories, reports, and copy',
  'tool.image': 'Images',
  'tool.imageDesc': 'Keyword images + free drawing from descriptions',
  'tool.video': 'Videos',
  'tool.videoDesc': 'Template videos + free video (with or without first frame)',
  'tool.mixed': 'Image Understanding',
  'tool.mixedDesc': 'Upload a picture and let AI look at it',
  'tool.web': 'Web Studio',
  'tool.webDesc': 'Scene → layout → interaction — build your web page in 3 steps',
  'tool.poster': 'AI Poster',
  'tool.posterDesc': 'Create downloadable creative posters',
  'tool.ppt': 'AI Slides',
  'tool.pptDesc': 'Quick presentation outlines',
  'tool.music': 'AI Music',
  'tool.musicDesc': 'Enter lyrics, tune 5 sliders, make your own song',

  // Common
  'common.loading': 'Loading…',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.submit': 'Submit',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.done': 'Done',
  'common.retry': 'Try again',
  'common.error': 'Something went wrong',
  'common.success': 'Success!',
  'common.generating': 'Creating…',
  'common.pleaseWait': 'Please wait…',

  // Explore
  'explore.back': '← Back to Explore',

  // Queue
  'queue.almost': '⏳ Almost your turn — hang tight!',

  // Settings
  'settings.title': 'My Settings',
  'settings.username': 'Username:',
  'settings.nickname': 'Nickname',
  'settings.changePassword': 'Change Password',
  'settings.passwordHint': 'Leave blank to keep current',
  'settings.saved': 'Saved ✅',
  'settings.quota': 'My Credits',
  'settings.balance': 'Balance:',
  'settings.monthly': 'Monthly',
  'settings.recentChanges': 'Recent Changes',
  'settings.shortcuts': 'Quick Links',

  // Lesson page
  'lesson.comingSoon': 'Coming Soon',
  'lesson.preview': 'Preview →',
  'lesson.start': 'Start →',
  'lesson.tools': 'Creative Tools',
  'lesson.toolsHint': '(Create images/videos during class too)',
  'lesson.openTool': 'Open Tool →',

  // Choice question
  'choice.addCustom': 'Write my own',
  'choice.customPlaceholder': 'Write your own idea',
  'choice.add': 'Add',
};

export function tEn(key: string, fallback?: string): string {
  return en[key] ?? fallback ?? key;
}
