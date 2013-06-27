(function($) {
	var $window = $(window);

	var Tripwire = function Tripwire(el, opts) {
		var self = this;

		if (typeof opts.test !== 'function')
			throw new Error('Tripwire Error: tripwire test option must be a function.');
		if (typeof opts.pass !== 'function')
			throw new Error('Tripwire Error: tripwire pass option must be a function.');
		if (opts.fail && typeof opts.fail !== 'function')
			throw new Error('Tripwire Error: tripwire fail option must be a function.');
		if (opts.initData && typeof opts.initData !== 'function')
			throw new Error('Tripwire Error: tripwire initData option must be a function.');

		// callbacks and handlers
		this.test = opts.test;
		this.pass = opts.pass;
		this.fail = opts.fail || $.noop;
		this.initData = opts.initData || $.noop;

		// basic state values
		this.el = el;
		this.tripped = undefined;
		this.data = {};
		

		// throttle behavior
		this.throttle = typeof opts.throttle === 'undefined' ? true : !!opts.throttle;
		this.throttleRate = typeof opts.throttle === 'number' ? opts.throttle : 11;
		this.prevTime = 0;
		this.testScheduled = false;	

		this.registerWindowHandlers();

		// let synchronous code complete before triggering handlers
		setTimeout(function() {
			self.initData.call(self.el, self.data);
			self.scheduleTest();
		}, 0);
	};

	Tripwire.prototype.runTest = function() {
		var testPassed = this.test.call(this.el, this.data);
		if (testPassed && !this.tripped) {
			this.tripped = true;
			this.pass.call(this.el, this.data);
		}
		// need to call fail if we're currently tripped or we haven't been initialized yet
		else if (!testPassed && (this.tripped || typeof this.tripped === 'undefined')) {
			this.tripped = false;
			this.fail.call(this.el, this.data);
		}
	};

	Tripwire.prototype.scheduleTest = function() {
		var self = this;

		// if we're not throttling, just run it
		if (!this.throttle) return this.runTest();

		// bail out if we already have one scheduled
		if (this.testScheduled) return;

		// check if it's too soon
		var now = +new Date();
		if (now - this.prevTime < this.throttleRate) {
			this.testScheduled = true;
			setTimeout(function() {
				self.testScheduled = false;
				self.prevTime = +new Date();
				self.runTest();
			}, this.throttleRate - (now - this.prevTime));
			return;
		} else {
			// throttle rate is satisfied, go ahead and run
			this.prevTime = now;
			this.runTest();
		}
	};

	Tripwire.prototype.registerWindowHandlers = function() {
		var self = this;
		$window.on('scroll resize', function() {
			self.scheduleTest();
		});
	};

	$.fn.tripwire = function(opts) {
		return this.each(function() {
			new Tripwire(this, opts);
		});
	};

})(jQuery);