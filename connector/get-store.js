var u = require('../tool/util');

function getStore(ctx) {
    while (true) { // eslint-disable-line
        if (!ctx) {
            throw new Error('Expected root Component be StoreProvider');
        }

        if (
            ctx.data &&
            ctx.data.store &&
            u.isReduxStore(ctx.data.store)
        ) {
            return ctx.data.store;
        }
        ctx = ctx.$parent;
    }
}

module.exports = getStore;