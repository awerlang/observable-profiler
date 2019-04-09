/**
 * Represents the source of an subscription
 */
export class SubscriptionSource extends Error {
    /**
     * @param subscription A subscription to an Observable
     * @param id The id of the subscription chain
     */
    constructor(readonly subscription: object, readonly id: number) {
        super();
    }
}

let subscribers: Set<SubscriptionSource>;
let isTracking = false;

/**
 * Call setup() once before any calls to track()
 * @param Observable Bring your own Observable class to track
 */
export function setup<T>(Observable: any) {
    const origSubscribe = Observable.prototype.subscribe;
    Observable.prototype.subscribe = subscribe;

    let id = 0;
    let root = false;
    function subscribe(this: any, ...args: any[]) {
        let setRoot = false;
        if (!root) {
            setRoot = true;
            root = true;
            id++;
        }
        const subscription = origSubscribe.apply(this, args);
        if (isTracking) {
            const currentSubscribers = subscribers;
            const sub = new SubscriptionSource(subscription, id);
            currentSubscribers.add(sub);
            subscription.add(() => {
                currentSubscribers.delete(sub);
            });
        }
        if (setRoot) {
            root = false;
        }
        return subscription;
    };
}

/**
 * Accessor to the current subscription list.
 */
export class Iterator {
    constructor(private readonly subscribers: Set<SubscriptionSource>) { }

    /**
     * Returns a snapshot of current subscriptions
     */
    current() {
        return [...this.subscribers];
    }
}

/**
 * Returns a snapshot of current subscriptions since tracking started
 */
export function getSubscribers() {
    return new Iterator(subscribers);
}

/**
 * Starts/stops tracking of Observable subscriptions
 * @param {boolean} track `true` to start; `false` to stop
 */
export function track(track = true) {
    if (isTracking === track) {
        return;
    }
    isTracking = track;
    if (track) {
        subscribers = new Set();
    }
    return getSubscribers();
}

function delay(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

/**
 * Outputs to console the list of active subscriptions
 * @param {string} prefix Prints a prefix on each tracked subscription
 * @param {number} timeout Give some leeway (in ms) for time-based subscriptions to finish
 * @param {boolean} rewriteStack `true` to remove some noise from stack traces
 * @param {RegExp} filterStackRe a custom Regexp object to filter stack frames
 * @param {boolean} reportInnerSubscriptions `true` to report indirect subscriptions
 * @param {Iterator} subscribers The result of a previous call to `tack(false)`
 */
export async function printSubscribers({
    prefix = '',
    timeout = 0,
    rewriteStack = false,
    filterStackRe = undefined,
    reportInnerSubscriptions = false,
    subscribers = undefined,
}: {
    prefix?: string,
    timeout?: number,
    rewriteStack?: boolean,
    filterStackRe?: RegExp,
    reportInnerSubscriptions?: boolean,
    subscribers?: Iterator,
}) {
    const sub = subscribers || getSubscribers();

    await delay(timeout);

    const current = sub.current();
    if (!current.length) {
        return;
    }

    console.error(prefix, 'Current subscriptions (including indirect/nested):', current.length);
    const map = new Set();
    current.forEach(val => {
        if (!reportInnerSubscriptions && map.has(val.id)) {
            return;
        }
        if (rewriteStack || filterStackRe) {
            const frames = val.stack!.split('\n');
            const stack = (filterStackRe && frames.filter(it => !it.includes('Observable.subscribe') && filterStackRe!.test(it)).join('\n')) || frames.join('\n');
            val.stack = stack;
        }
        console.error(prefix, `#${val.id}:`, val);
        map.add(val.id);
    });
}
