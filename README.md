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
        (window as any).stopProfiler = () => {
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

## FAQ

**1. Which recipe should I use?**

A: If you're using a router, start with the router recipe, subscription tracking begins when the routed component is activated i.e. after its construction. The router recipe is intended to catch leaks as fast and localized as possible. Once you're done with router tests, use the bootstrap recipe, which would catch many more leaks, including work done outside router.

**2. I'm seeing errors in the browser's console. Are they bugs in the `observable-profiler`?**

A: The profiler will output a line `Current subscriptions (including indirect/nested): ...`, followed by a list of stack traces. Each stack trace points to a place where a subscription to an observable was made, but not yet released. The subscription might be released at a later point once it goes out of scope, but some of these are actual coding mistakes.

**3. How can I make sense of the profiler's output?**

A: The output is a stack trace, see question number 2. The last line in a stack trace likely is pointing to the source of the subscription. If that's on your own code, great, you should be able to fix it by releasing the subscription in the appropriate place and time. If it doesn't point to your own code, then it might be a problem for the third-party to solve. I suggest you report to them as a bug linking to a repro built with this tool.

**4. There's no output, is that right?**

A: If you're doing a great job, then that's right, there are no leaks. Or may be the case that no subscription was made during the period the profiler was working, as it can only catch subscriptions after tracking has begun.

**5. Does the profiler works with libraries built on top of observables, like ngrx?**

A: Yes. There's nothing special about them.

**6. Any last advice?**

A: In components, always subscribe in the `ngOnInit()` lifecycle event. Constructors are only meant for initializing fields in the component.

## License

MIT
