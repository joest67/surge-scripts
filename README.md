# surge-scripts

Personal Surge scripts and modules.

## Douban Book WeRead

Adds a compact WeRead search section to Douban mobile book subject pages. The
script searches WeRead with the current Douban book title, shows matching
results, and keeps a small "jump to search" link.

Example page:

```text
https://m.douban.com/book/subject/37077202/
```

The fallback search link opens:

```text
https://weread.qq.com/web/search/books?keyword=<book-title>
```

### Preview

<img src="assets/douban-book-weread-iphone12pro.png" alt="Douban Book WeRead preview" width="360">

- GitHub: https://github.com/joest67/surge-scripts/blob/main/assets/douban-book-weread-iphone12pro.png
- Raw: https://raw.githubusercontent.com/joest67/surge-scripts/main/assets/douban-book-weread-iphone12pro.png

### URL Install

Install this module in Surge with the raw module URL:

```text
https://raw.githubusercontent.com/joest67/surge-scripts/main/modules/DoubanBookWeRead.sgmodule
```

The module references the JavaScript file by absolute raw URL:

```ini
script-path=https://raw.githubusercontent.com/joest67/surge-scripts/main/scripts/DoubanBookWeRead.js?v=20260704-1
```

This is recommended for URL installation. If `script-path` is a local relative
path, Surge may not be able to resolve it when the module itself is installed
from a remote URL.

### Local Install

If the repository is used as the Surge profile directory, you may also change
the module to use a local script path:

```ini
script-path=scripts/DoubanBookWeRead.js,debug=true
```

On Surge Mac, `debug=true` reloads the script from the filesystem before each
execution, which is useful while adjusting the local script.

Keep this layout:

```text
surge-scripts/
  modules/
    DoubanBookWeRead.sgmodule
  scripts/
    DoubanBookWeRead.js
```

### Required Surge Settings

The module appends `m.douban.com` to MITM hostnames:

```ini
[MITM]
hostname = %APPEND% m.douban.com
```

You still need to enable MITM in Surge and install/trust the Surge CA
certificate on the device.

### What The Module Does

```ini
[Script]
DoubanBookWeRead = type=http-response,pattern=^https://m\.douban\.com/book/subject/\d+/?$,requires-body=1,max-size=0,script-path=https://raw.githubusercontent.com/joest67/surge-scripts/main/scripts/DoubanBookWeRead.js?v=20260704-1,script-update-interval=60
```

The response script replaces the Douban subject banner with a compact WeRead
result shelf. The header uses the WeRead icon, shows a small matched-title note
when a high-confidence result is found, and provides a small "jump to search"
link.
Open Douban with a mobile browser mode, such as Chrome DevTools device mode,
so `https://m.douban.com/book/subject/...` stays on the mobile site instead of
redirecting to `https://book.douban.com/subject/...`.

### Files

- `modules/DoubanBookWeRead.sgmodule`: Surge module.
- `scripts/DoubanBookWeRead.js`: HTTP response script.
