function DoneFlag() {
    this.reset();
}

var proto = DoneFlag.prototype;

proto.done = function() {
    this.doneFlag = true;
};

proto.isDone = function() {
    return this.doneFlag === true;
};

proto.reset = function() {
    this.doneFlag = false;
};

module.exports = DoneFlag;