var DoneFlag = require('./done-flag');
var u = require('../tool/util');

function StoreProvider(Component/*, BaseRegular*/) {
    mount(Component);
}

var flag = new DoneFlag();

function mount(Component) {
    return Component.extend({
        name: 'StoreProvider',
        template: '{#include this.$body}',
        config: function config() {
            var self = this,
                data = this.data,
                store = data.store;

            if (!u.isReduxStore(store)) {
                throw new Error('Provider expected data.store to be store instance created by redux.createStore()');
            }

            store.subscribe(function() {
                flag.done();

                u.nextTick(function() {
                    // 确保一帧中最多$update一次
                    if (flag.isDone()) {
                        self.$update();
                        flag.reset();
                    }
                });
            });
        }
    });
}

module.exports = StoreProvider;