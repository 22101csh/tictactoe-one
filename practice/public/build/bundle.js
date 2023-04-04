
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.57.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.57.0 */

    const file = "src\\App.svelte";

    // (52:1) {:else}
    function create_else_block_1(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "current player : second player";
    			attr_dev(h1, "class", "svelte-1oo8kci");
    			add_location(h1, file, 52, 2, 1584);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(52:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (50:19) 
    function create_if_block_2(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "current player : first player";
    			attr_dev(h1, "class", "svelte-1oo8kci");
    			add_location(h1, file, 50, 2, 1534);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(50:19) ",
    		ctx
    	});

    	return block;
    }

    // (42:1) {#if endGame != ""}
    function create_if_block(ctx) {
    	let h1;
    	let t1;
    	let t2;
    	let button;
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*endGame*/ ctx[2] === "win") return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "game is over,";
    			t1 = space();
    			if_block.c();
    			t2 = space();
    			button = element("button");
    			button.textContent = "play again!";
    			attr_dev(h1, "class", "svelte-1oo8kci");
    			add_location(h1, file, 42, 2, 1293);
    			attr_dev(button, "class", "resetBtn svelte-1oo8kci");
    			add_location(button, file, 48, 2, 1439);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[6], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(t2.parentNode, t2);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if_block.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(42:1) {#if endGame != \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (46:2) {:else}
    function create_else_block(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "it is a draw";
    			attr_dev(h1, "class", "w svelte-1oo8kci");
    			add_location(h1, file, 46, 3, 1397);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(46:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (44:2) {#if endGame === "win"}
    function create_if_block_1(ctx) {
    	let h1;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text("winner is ");
    			t1 = text(/*winner*/ ctx[3]);
    			t2 = text("!");
    			attr_dev(h1, "class", "w svelte-1oo8kci");
    			add_location(h1, file, 44, 3, 1345);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*winner*/ 8) set_data_dev(t1, /*winner*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(44:2) {#if endGame === \\\"win\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let t0;
    	let table;
    	let tr0;
    	let td0;
    	let t1_value = /*pa*/ ctx[1][1] + "";
    	let t1;
    	let t2;
    	let td1;
    	let t3_value = /*pa*/ ctx[1][2] + "";
    	let t3;
    	let t4;
    	let td2;
    	let t5_value = /*pa*/ ctx[1][3] + "";
    	let t5;
    	let t6;
    	let tr1;
    	let td3;
    	let t7_value = /*pa*/ ctx[1][4] + "";
    	let t7;
    	let t8;
    	let td4;
    	let t9_value = /*pa*/ ctx[1][5] + "";
    	let t9;
    	let t10;
    	let td5;
    	let t11_value = /*pa*/ ctx[1][6] + "";
    	let t11;
    	let t12;
    	let tr2;
    	let td6;
    	let t13_value = /*pa*/ ctx[1][7] + "";
    	let t13;
    	let t14;
    	let td7;
    	let t15_value = /*pa*/ ctx[1][8] + "";
    	let t15;
    	let t16;
    	let td8;
    	let t17_value = /*pa*/ ctx[1][9] + "";
    	let t17;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*endGame*/ ctx[2] != "") return create_if_block;
    		if (/*x*/ ctx[0] === 1) return create_if_block_2;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if_block.c();
    			t0 = space();
    			table = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			t1 = text(t1_value);
    			t2 = space();
    			td1 = element("td");
    			t3 = text(t3_value);
    			t4 = space();
    			td2 = element("td");
    			t5 = text(t5_value);
    			t6 = space();
    			tr1 = element("tr");
    			td3 = element("td");
    			t7 = text(t7_value);
    			t8 = space();
    			td4 = element("td");
    			t9 = text(t9_value);
    			t10 = space();
    			td5 = element("td");
    			t11 = text(t11_value);
    			t12 = space();
    			tr2 = element("tr");
    			td6 = element("td");
    			t13 = text(t13_value);
    			t14 = space();
    			td7 = element("td");
    			t15 = text(t15_value);
    			t16 = space();
    			td8 = element("td");
    			t17 = text(t17_value);
    			attr_dev(td0, "class", "svelte-1oo8kci");
    			add_location(td0, file, 56, 3, 1650);
    			attr_dev(td1, "class", "svelte-1oo8kci");
    			add_location(td1, file, 57, 3, 1693);
    			attr_dev(td2, "class", "svelte-1oo8kci");
    			add_location(td2, file, 58, 3, 1736);
    			attr_dev(tr0, "class", "svelte-1oo8kci");
    			add_location(tr0, file, 55, 2, 1642);
    			attr_dev(td3, "class", "svelte-1oo8kci");
    			add_location(td3, file, 61, 3, 1794);
    			attr_dev(td4, "class", "svelte-1oo8kci");
    			add_location(td4, file, 62, 3, 1837);
    			attr_dev(td5, "class", "svelte-1oo8kci");
    			add_location(td5, file, 63, 3, 1880);
    			attr_dev(tr1, "class", "svelte-1oo8kci");
    			add_location(tr1, file, 60, 2, 1786);
    			attr_dev(td6, "class", "svelte-1oo8kci");
    			add_location(td6, file, 66, 3, 1938);
    			attr_dev(td7, "class", "svelte-1oo8kci");
    			add_location(td7, file, 67, 3, 1981);
    			attr_dev(td8, "class", "svelte-1oo8kci");
    			add_location(td8, file, 68, 3, 2024);
    			attr_dev(tr2, "class", "svelte-1oo8kci");
    			add_location(tr2, file, 65, 2, 1930);
    			attr_dev(table, "class", "svelte-1oo8kci");
    			add_location(table, file, 54, 1, 1632);
    			attr_dev(main, "class", "svelte-1oo8kci");
    			add_location(main, file, 40, 0, 1263);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if_block.m(main, null);
    			append_dev(main, t0);
    			append_dev(main, table);
    			append_dev(table, tr0);
    			append_dev(tr0, td0);
    			append_dev(td0, t1);
    			append_dev(tr0, t2);
    			append_dev(tr0, td1);
    			append_dev(td1, t3);
    			append_dev(tr0, t4);
    			append_dev(tr0, td2);
    			append_dev(td2, t5);
    			append_dev(table, t6);
    			append_dev(table, tr1);
    			append_dev(tr1, td3);
    			append_dev(td3, t7);
    			append_dev(tr1, t8);
    			append_dev(tr1, td4);
    			append_dev(td4, t9);
    			append_dev(tr1, t10);
    			append_dev(tr1, td5);
    			append_dev(td5, t11);
    			append_dev(table, t12);
    			append_dev(table, tr2);
    			append_dev(tr2, td6);
    			append_dev(td6, t13);
    			append_dev(tr2, t14);
    			append_dev(tr2, td7);
    			append_dev(td7, t15);
    			append_dev(tr2, t16);
    			append_dev(tr2, td8);
    			append_dev(td8, t17);

    			if (!mounted) {
    				dispose = [
    					listen_dev(td0, "click", /*click_handler_1*/ ctx[7], false, false, false, false),
    					listen_dev(td1, "click", /*click_handler_2*/ ctx[8], false, false, false, false),
    					listen_dev(td2, "click", /*click_handler_3*/ ctx[9], false, false, false, false),
    					listen_dev(td3, "click", /*click_handler_4*/ ctx[10], false, false, false, false),
    					listen_dev(td4, "click", /*click_handler_5*/ ctx[11], false, false, false, false),
    					listen_dev(td5, "click", /*click_handler_6*/ ctx[12], false, false, false, false),
    					listen_dev(td6, "click", /*click_handler_7*/ ctx[13], false, false, false, false),
    					listen_dev(td7, "click", /*click_handler_8*/ ctx[14], false, false, false, false),
    					listen_dev(td8, "click", /*click_handler_9*/ ctx[15], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(main, t0);
    				}
    			}

    			if (dirty & /*pa*/ 2 && t1_value !== (t1_value = /*pa*/ ctx[1][1] + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*pa*/ 2 && t3_value !== (t3_value = /*pa*/ ctx[1][2] + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*pa*/ 2 && t5_value !== (t5_value = /*pa*/ ctx[1][3] + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*pa*/ 2 && t7_value !== (t7_value = /*pa*/ ctx[1][4] + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*pa*/ 2 && t9_value !== (t9_value = /*pa*/ ctx[1][5] + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*pa*/ 2 && t11_value !== (t11_value = /*pa*/ ctx[1][6] + "")) set_data_dev(t11, t11_value);
    			if (dirty & /*pa*/ 2 && t13_value !== (t13_value = /*pa*/ ctx[1][7] + "")) set_data_dev(t13, t13_value);
    			if (dirty & /*pa*/ 2 && t15_value !== (t15_value = /*pa*/ ctx[1][8] + "")) set_data_dev(t15, t15_value);
    			if (dirty & /*pa*/ 2 && t17_value !== (t17_value = /*pa*/ ctx[1][9] + "")) set_data_dev(t17, t17_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let x = 1;
    	let pa = ["", "", "", "", "", "", "", "", "", ""];
    	let endGame = "";
    	let winner = "";

    	function checkWin() {
    		if (pa[1] == pa[2] && pa[2] == pa[3] && pa[3] != "") $$invalidate(2, endGame = "win"); else if (pa[4] == pa[5] && pa[5] == pa[6] && pa[6] != "") $$invalidate(2, endGame = "win"); else if (pa[7] == pa[8] && pa[8] == pa[9] && pa[9] != "") $$invalidate(2, endGame = "win"); else if (pa[1] == pa[4] && pa[4] == pa[7] && pa[7] != "") $$invalidate(2, endGame = "win"); else if (pa[2] == pa[5] && pa[5] == pa[8] && pa[8] != "") $$invalidate(2, endGame = "win"); else if (pa[3] == pa[6] && pa[6] == pa[9] && pa[9] != "") $$invalidate(2, endGame = "win"); else if (pa[1] == pa[5] && pa[5] == pa[9] && pa[9] != "") $$invalidate(2, endGame = "win"); else if (pa[3] == pa[5] && pa[5] == pa[7] && pa[7] != "") $$invalidate(2, endGame = "win"); else if (pa[1] != "" && pa[2] != "" && pa[3] != "" && pa[4] != "" && pa[5] != "" && pa[6] != "" && pa[7] != "" && pa[8] != "" && pa[9] != "") $$invalidate(2, endGame = "draw");
    		if (x == 1) $$invalidate(3, winner = "first player"); else $$invalidate(3, winner = "second player");
    	}

    	function fq(a) {
    		if (endGame === "" && pa[a] === "") {
    			if (x == 1) $$invalidate(1, pa[a] = "first player", pa); else $$invalidate(1, pa[a] = "second player", pa);
    			checkWin();
    			$$invalidate(0, x = 3 - x);
    		}
    	}

    	function reset() {
    		for (let i = 1; i <= 9; i++) {
    			$$invalidate(1, pa[i] = "", pa);
    		}

    		$$invalidate(2, endGame = "");
    		$$invalidate(3, winner = "");
    		$$invalidate(0, x = 1);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => reset();
    	const click_handler_1 = () => fq(1);
    	const click_handler_2 = () => fq(2);
    	const click_handler_3 = () => fq(3);
    	const click_handler_4 = () => fq(4);
    	const click_handler_5 = () => fq(5);
    	const click_handler_6 = () => fq(6);
    	const click_handler_7 = () => fq(7);
    	const click_handler_8 = () => fq(8);
    	const click_handler_9 = () => fq(9);

    	$$self.$capture_state = () => ({
    		x,
    		pa,
    		endGame,
    		winner,
    		checkWin,
    		fq,
    		reset
    	});

    	$$self.$inject_state = $$props => {
    		if ('x' in $$props) $$invalidate(0, x = $$props.x);
    		if ('pa' in $$props) $$invalidate(1, pa = $$props.pa);
    		if ('endGame' in $$props) $$invalidate(2, endGame = $$props.endGame);
    		if ('winner' in $$props) $$invalidate(3, winner = $$props.winner);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		x,
    		pa,
    		endGame,
    		winner,
    		fq,
    		reset,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
