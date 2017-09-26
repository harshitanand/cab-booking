(() => {
  // This is for grouping buttons into a bar
  // takes an array of `L.easyButton`s and
  // then the usual `.addTo(map)`
  L.Control.EasyBar = L.Control.extend({
    options: {
      position: "topleft", // part of leaflet's defaults
      id: null, // an id to tag the Bar with
      leafletClasses: true, // use leaflet classes?
    },

    initialize(buttons, options) {
      if (options) {
        L.Util.setOptions(this, options);
      }

      this._buildContainer();
      this._buttons = [];

      for (let i = 0; i < buttons.length; i++) {
        buttons[i]._bar = this;
        buttons[i]._container = buttons[i].button;
        this._buttons.push(buttons[i]);
        this.container.appendChild(buttons[i].button);
      }
    },

    _buildContainer() {
      this._container = this.container = L.DomUtil.create("div", "");
      this.options.leafletClasses &&
        L.DomUtil.addClass(
          this.container,
          "leaflet-bar easy-button-container leaflet-control"
        );
      this.options.id && (this.container.id = this.options.id);
    },

    enable() {
      L.DomUtil.addClass(this.container, "enabled");
      L.DomUtil.removeClass(this.container, "disabled");
      this.container.setAttribute("aria-hidden", "false");
      return this;
    },

    disable() {
      L.DomUtil.addClass(this.container, "disabled");
      L.DomUtil.removeClass(this.container, "enabled");
      this.container.setAttribute("aria-hidden", "true");
      return this;
    },

    onAdd() {
      return this.container;
    },

    addTo(map) {
      this._map = map;

      for (let i = 0; i < this._buttons.length; i++) {
        this._buttons[i]._map = map;
      }

      const container = (this._container = this.onAdd(map));
      const pos = this.getPosition();
      const corner = map._controlCorners[pos];

      L.DomUtil.addClass(container, "leaflet-control");

      if (pos.includes("bottom")) {
        corner.insertBefore(container, corner.firstChild);
      } else {
        corner.appendChild(container);
      }

      return this;
    },
  });

  L.easyBar = function() {
    const args = [L.Control.EasyBar];
    for (let i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    return new (Function.prototype.bind.apply(L.Control.EasyBar, args))();
  };

  // L.EasyButton is the actual buttons
  // can be called without being grouped into a bar
  L.Control.EasyButton = L.Control.extend({
    options: {
      position: "topleft", // part of leaflet's defaults

      id: null, // an id to tag the button with

      type: "replace", // [(replace|animate)]
      // replace swaps out elements
      // animate changes classes with all elements inserted

      states: [], // state names look like this
      // {
      //   stateName: 'untracked',
      //   onClick: function(){ handle_nav_manually(); };
      //   title: 'click to make inactive',
      //   icon: 'fa-circle',    // wrapped with <a>
      // }

      leafletClasses: true, // use leaflet styles for the button
    },

    initialize(icon, onClick, title, id) {
      // clear the states manually
      this.options.states = [];

      // add id to options
      if (id != null) {
        this.options.id = id;
      }

      // storage between state functions
      this.storage = {};

      // is the last item an object?
      if (typeof arguments[arguments.length - 1] === "object") {
        // if so, it should be the options
        L.Util.setOptions(this, arguments[arguments.length - 1]);
      }

      // if there aren't any states in options
      // use the early params
      if (
        this.options.states.length === 0 &&
        typeof icon === "string" &&
        typeof onClick === "function"
      ) {
        // turn the options object into a state
        this.options.states.push({
          icon,
          onClick,
          title: typeof title === "string" ? title : "",
        });
      }

      // curate and move user's states into
      // the _states for internal use
      this._states = [];

      for (let i = 0; i < this.options.states.length; i++) {
        this._states.push(new State(this.options.states[i], this));
      }

      this._buildButton();

      this._activateState(this._states[0]);
    },

    _buildButton() {
      this.button = L.DomUtil.create("button", "");

      if (this.options.id) {
        this.button.id = this.options.id;
      }

      if (this.options.leafletClasses) {
        L.DomUtil.addClass(this.button, "easy-button-button leaflet-bar-part");
      }

      // don't let double clicks get to the map
      L.DomEvent.addListener(this.button, "dblclick", L.DomEvent.stop);

      // take care of normal clicks
      L.DomEvent.addListener(
        this.button,
        "click",
        function(e) {
          L.DomEvent.stop(e);
          this._currentState.onClick(this, this._map ? this._map : null);
          this._map.getContainer().focus();
        },
        this
      );

      // prep the contents of the control
      if (this.options.type == "replace") {
        this.button.appendChild(this._currentState.icon);
      } else {
        for (let i = 0; i < this._states.length; i++) {
          this.button.appendChild(this._states[i].icon);
        }
      }
    },

    _currentState: {
      // placeholder content
      stateName: "unnamed",
      icon: (() => document.createElement("span"))(),
    },

    _states: null, // populated on init

    state(newState) {
      // activate by name
      if (typeof newState == "string") {
        this._activateStateNamed(newState);

        // activate by index
      } else if (typeof newState == "number") {
        this._activateState(this._states[newState]);
      }

      return this;
    },

    _activateStateNamed(stateName) {
      for (let i = 0; i < this._states.length; i++) {
        if (this._states[i].stateName == stateName) {
          this._activateState(this._states[i]);
        }
      }
    },

    _activateState(newState) {
      if (newState === this._currentState) {
        // don't touch the dom if it'll just be the same after
        return;
      } else {
        // swap out elements... if you're into that kind of thing
        if (this.options.type == "replace") {
          this.button.appendChild(newState.icon);
          this.button.removeChild(this._currentState.icon);
        }

        if (newState.title) {
          this.button.title = newState.title;
        } else {
          this.button.removeAttribute("title");
        }

        // update classes for animations
        for (let i = 0; i < this._states.length; i++) {
          L.DomUtil.removeClass(
            this._states[i].icon,
            `${this._currentState.stateName}-active`
          );
          L.DomUtil.addClass(
            this._states[i].icon,
            `${newState.stateName}-active`
          );
        }

        // update classes for animations
        L.DomUtil.removeClass(
          this.button,
          `${this._currentState.stateName}-active`
        );
        L.DomUtil.addClass(this.button, `${newState.stateName}-active`);

        // update the record
        this._currentState = newState;
      }
    },

    enable() {
      L.DomUtil.addClass(this.button, "enabled");
      L.DomUtil.removeClass(this.button, "disabled");
      this.button.setAttribute("aria-hidden", "false");
      return this;
    },

    disable() {
      L.DomUtil.addClass(this.button, "disabled");
      L.DomUtil.removeClass(this.button, "enabled");
      this.button.setAttribute("aria-hidden", "true");
      return this;
    },

    removeFrom(map) {
      this._container.parentNode.removeChild(this._container);
      this._map = null;

      return this;
    },

    onAdd() {
      const containerObj = L.easyBar([this], {
        position: this.options.position,
        leafletClasses: this.options.leafletClasses,
      });
      this._container = containerObj.container;
      return this._container;
    },
  });

  L.easyButton = function(/* args will pass automatically */) {
    const args = Array.prototype.concat.apply(
      [L.Control.EasyButton],
      arguments
    );
    return new (Function.prototype.bind.apply(L.Control.EasyButton, args))();
  };

  /*************************
 *
 * util functions
 *
 *************************/

  // constructor for states so only curated
  // states end up getting called
  function State(template, easyButton) {
    this.title = template.title;
    this.stateName = template.stateName ? template.stateName : "unnamed-state";

    // build the wrapper
    this.icon = L.DomUtil.create("span", "");

    L.DomUtil.addClass(
      this.icon,
      `button-state state-${this.stateName.replace(/(^\s*|\s*$)/g, "")}`
    );
    this.icon.innerHTML = buildIcon(template.icon);
    this.onClick = L.Util.bind(
      template.onClick ? template.onClick : () => {},
      easyButton
    );
  }

  function buildIcon(ambiguousIconString) {
    let tmpIcon;

    // does this look like html? (i.e. not a class)
    if (ambiguousIconString.match(/[&;=<>"']/)) {
      // if so, the user should have put in html
      // so move forward as such
      tmpIcon = ambiguousIconString;

      // then it wasn't html, so
      // it's a class list, figure out what kind
    } else {
      ambiguousIconString = ambiguousIconString.replace(/(^\s*|\s*$)/g, "");
      tmpIcon = L.DomUtil.create("span", "");

      if (ambiguousIconString.indexOf("fa-") === 0) {
        L.DomUtil.addClass(tmpIcon, `fa ${ambiguousIconString}`);
      } else if (ambiguousIconString.indexOf("glyphicon-") === 0) {
        L.DomUtil.addClass(tmpIcon, `glyphicon ${ambiguousIconString}`);
      } else {
        L.DomUtil.addClass(tmpIcon, /*rollwithit*/ ambiguousIconString);
      }

      // make this a string so that it's easy to set innerHTML below
      tmpIcon = tmpIcon.outerHTML;
    }

    return tmpIcon;
  }
})();