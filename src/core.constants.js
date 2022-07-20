const NODE_PREFIX = 'octotree';
const ADDON_CLASS = 'octotree';
const SHOW_CLASS = 'octotree-show';
const PINNED_CLASS = 'octotree-pinned';
const API_URL = "http://localhost:5000/api";

const STORE = {
  TOKEN: 'octotree.token.local',
  HOVEROPEN: 'octotree.hover_open',
  PR: 'octotree.prdiff_shown',
  HOTKEYS: 'octotree.hotkeys',
  ICONS: 'octotree.icons',
  LAZYLOAD: 'octotree.lazyload',
  POPUP: 'octotree.popup_shown',
  WIDTH: 'octotree.sidebar_width',
  SHOWN: 'octotree.sidebar_shown',
  PINNED: 'octotree.sidebar_pinned',
  HUGE_REPOS: 'octotree.huge_repos',
  SELECTION_TEXT: 'octotree.selection_text',
  FILE_PATH: 'octotree.filepath',
  TREE_DATA: 'octotree.tree_data',
  METHOD_NAME: 'octotree.method_name'
};

const DEFAULTS = {
  TOKEN: '',
  HOVEROPEN: true,
  PR: true,
  LAZYLOAD: false,
  HOTKEYS: '⌘+⇧+s, ⌃+⇧+s',
  ICONS: true,
  POPUP: false,
  WIDTH: 232,
  SHOWN: false,
  PINNED: false,
  HUGE_REPOS: {},
  SELECTION_TEXT: "",
  FILE_PATH: '',
  TREE_DATA: {},
  METHOD_NAME: ""
};

const EVENT = {
  TOGGLE: 'octotree:toggle',
  TOGGLE_PIN: 'octotree:pin',
  LOC_CHANGE: 'octotree:location',
  LAYOUT_CHANGE: 'octotree:layout',
  REQ_START: 'octotree:start',
  REQ_END: 'octotree:end',
  STORE_CHANGE: 'octotree:storeChange',
  VIEW_READY: 'octotree:ready',
  VIEW_CLOSE: 'octotree:close',
  VIEW_SHOW: 'octotree:show',
  FETCH_ERROR: 'octotree:error',
  SIDEBAR_HTML_INSERTED: 'octotree:sidebarHtmlInserted',
  REPO_LOADED: 'octotree:repoLoaded'
};

window.STORE = STORE;
window.DEFAULTS = DEFAULTS;
window.EVENT = EVENT;
