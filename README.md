# observable-profiler

[![npm](https://img.shields.io/npm/v/observable-profiler.svg)](https://www.npmjs.com/package/observable-profiler)
[![GitHub](https://img.shields.io/github/license/awerlang/observable-profiler.svg)](https://opensource.org/licenses/MIT)
[![Travis (.org)](https://img.shields.io/travis/awerlang/observable-profiler.svg)](https://travis-ci.org/awerlang/observable-profiler)
[![Code Climate](https://codeclimate.com/github/awerlang/observable-profiler/badges/gpa.svg)](https://codeclimate.com/github/awerlang/observable-profiler)

Tracks new & disposed Observable subscriptions.

## Usage

```ts
import { setup, track, printSubscribers } from 'observable-profiler';

// Call `setup` once, passing the Observable class (usually imported from `rxjs`)
setup(Observable);
// We're not tracking subscriptions yet, but have the basic support in-place by monkey-patching `Observable#subscribe()`

track();
// Subscriptions at this point are now being tracked
...
// Call `track(false)` to stop tracking, and return a list of pending subscriptions.
const subscribers = track(false);
// Output to console pending subscriptions (leaks, probably)
printSubscribers({
    subscribers,
});
```

## Recipes

### Angular Bootstrap

Begins tracking subscriptions once the app bootstraps (Angular itself doesn't unsubscribe everything, so it's better to start tracking not earlier than this moment). Perform the tests on the app. Call `window.stopProfiler()` once you want a report of pending subscriptions. The app will be unloaded.

```ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Observable } from 'rxjs';
import { setup, track, printSubscribers } from 'observable-profiler';

setup(Observable);
platformBrowserDynamic([])
    .bootstrapModule(AppModule)
    .then(ref => {
        track();
        window.stopProfiler = () => {
            ref.destroy();
            const subscribers = track(false);
            printSubscribers({
                subscribers,
            });
        }
    });
```

### Angular Router

This recipe collects subscriptions during the usage of a page, and reports pending subscriptions once it is navigated away.
Because Angular runs resolvers before the current route is deactivated, it may report false positives (for resolvers).
Also, use this snippet in the root outlet, do not nest trackers.

```ts
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { setup, track, printSubscribers } from 'observable-profiler';

import { environment } from '../../../../environments/environment';

if (!environment.production) {
    setup(Observable);
}

@Component({
    selector: 'main',
    template: '<router-outlet (activate)="onActivate()" (deactivate)="onDeactivate($event)"></router-outlet>',
})
export class MainComponent {
    onActivate() {
        track();
    }

    onDeactivate(component: object) {
        const subscribers = track(false);
        printSubscribers({
            subscribers,
            prefix: component.constructor.name,
            timeout: 200,
        });
    }
}
```

## Installation

    npm install observable-profiler

## License

MIT
