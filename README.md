# surge-scripts

Personal Surge scripts and modules.

## Douban Book WeRead

Adds a **WeRead** button to Douban mobile book subject pages. The button opens
WeRead search with the current Douban book title.

Example page:

```text
https://m.douban.com/book/subject/37077202/
```

The injected button links to:

```text
https://weread.qq.com/web/search/books?keyword=<book-title>
```

### URL Install

Install this module in Surge with the raw module URL:

```text
https://raw.githubusercontent.com/joest67/surge-scripts/main/modules/DoubanBookWeRead.sgmodule
```

The module references the JavaScript file by absolute raw URL:

```ini
script-path=https://raw.githubusercontent.com/joest67/surge-scripts/main/scripts/DoubanBookWeRead.js
```

This is recommended for URL installation. If `script-path` is a local relative
path, Surge may not be able to resolve it when the module itself is installed
from a remote URL.

### Local Install

If the repository is used as the Surge profile directory, you may also change
the module to use a local script path:

```ini
script-path=scripts/DoubanBookWeRead.js
```

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

### Files

- `modules/DoubanBookWeRead.sgmodule`: Surge module.
- `scripts/DoubanBookWeRead.js`: HTTP response script.
