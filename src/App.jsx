import React, {createRef, useEffect} from 'react';
import querystring from 'querystring';
import p2 from 'p2'
import './App.scss';


function App(props) {
  const _props = {...querystring.decode(window.location.search.substr(1)), ...props};
  const sanitizedPath = window.location.pathname === '/' ? "" : window.location.pathname;
  const {
    eventsPrefix = 'wheel',
    idPrefix = 'wheel',
    canvas_bg_color = null,
    canvas_bg_img = null,
    initial_spin = -.1,
    particles = {},
    wheel = {},
    button = {},
    arrow = {},
    audio = {},
    events = {} //onrender, onwin, onlose, onspinstart, onspinend, onsegmentchange,
  } = _props;

  // START defaultProps
  let {
    tries = 1,
    view_width = '100%',
    view_height = 400,
  } = _props;

  const {
    segments = 12,
    wheel_border_color = '#db9e36',
    wheel_bg_color = '#e51c22',
    wheel_border_width = 25,
    wheel_pin_color = ['#dbb134', '#f0d462', '#ffe6c9'],
    wheel_arrow_color = '#ffcc15',
    wheel_slice_colors = ['#e51c22', '#ffffff'],
    wheel_slice_border_width = 4,
    wheel_mass = 1,
    wheel_image = `${sanitizedPath}/assets/img/wheel-bg.png`,
    wheel_frame = `${sanitizedPath}/assets/img/wheel-brdr.png`,
    wheel_frame_size=13, //percent
    win = parseInt(_props.w, 10),
    no_win_segment = 0,
    pin_radius = 0.2,
    render_pins = true,
    manual_spin = true,
    min_manual_spin_velocity = 4
  } = ('string' === typeof wheel ? JSON.parse(wheel) : wheel);

  const {
    arrowstop = 8,
    arrowsize = [2.1, 2.4],
    arrowoffset = 1,
    arrowmass = 1,
    arrowimage = `${sanitizedPath}/assets/img/arrow.svg`,
  } = ('string' === typeof arrow ? JSON.parse(arrow) : arrow);

  const {
    btn_color = '#ffffff',
    btn_stroke_color = '#333333',
    btn_shadow = '#cccccc',
    btn_image = `${sanitizedPath}/assets/img/wheel-button.png`,
  } = ('string' === typeof button ? JSON.parse(button) : button);

  let sounds = {
    click : {
      src   : `${window.location.pathname}/assets/sounds/click.m4a`,
      volume: .1,
      ref   : React.createRef(),
    },
    wining: {
      src   : `${window.location.pathname}/assets/sounds/positive_winning.m4a`,
      volume: .4,
      ref   : React.createRef(),
    },
    salute: {
      src   : `${window.location.pathname}/assets/sounds/shoot.m4a`,
      volume: .2,
      ref   : React.createRef(),
    },
    lose  : {
      src   : `${window.location.pathname}/assets/sounds/lose.m4a`,
      volume: .2,
      ref   : React.createRef(),
    },
  };
  const _audio = ('string' === typeof audio ? JSON.parse(audio) : audio)
  for (let prop in sounds) {
    sounds[prop] = {...sounds[prop], ...(_audio[prop] || {})}
  }
  const {click, wining, salute, lose} = sounds;
  // END defaultProps

  const
    two_pi = Math.PI * 2,
    half_pi = Math.PI * 0.5,
    delta_pi = two_pi / segments,
    timestep = (1 / 60),
    ppm = 24; //pixels per meter as p2.js measure in meters and canvas in pixels;

  let
    segment = segments,
    canvasRef = createRef(),
    ctx,
    canvas_img,
    viewcenterx,
    viewcentery,
    vs,
    /*arrowoffset,*/
    pin_distance,
    pin_radius_calculated,
    wheel_radius,
    physicswidth,
    physicsheight,
    physicscenterx,
    physicscentery,
    world,
    wheelInstance,
    arrowInstance,
    btnInstance,
    frame,
    mousebody,
    mouseconstraint,
    arrow_material,
    arrowCalculatedSize,
    pin_material,
    btn_material,
    contact_material,
    wheel_spinned = false,
    wheel_stopped = true,
    particlesArr = [],
    timestamp = 0,
    frame_radius,
    btn_radius,
    tooweak = false,
    touchstart = false;

  function trigger(evtName = '', opts = {}) {
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent(eventsPrefix + '_' + evtName, true, true, opts);
    try{
      canvasRef.current.dispatchEvent(event, opts);
    } catch (e) {
        !!console && console.warn(e)
    }
    !!events[`on${evtName}`] && events[`on${evtName}`](opts);
    if (window.location.href.indexOf("debug") >= 0) {
      console.log('****** Wheel event', evtName, opts)
    }
  }

  function initCanvasRef() {

    if(!canvasRef.current){return}
    //get canvas size from DOM object
    view_width = canvasRef.current.clientWidth;
    view_height = canvasRef.current.clientHeight;

    // set as attributes on canvas - required for correct drawing
    canvasRef.current.width = view_width;
    canvasRef.current.height = view_height;

    if (view_height !== view_width) {
      view_height = view_width;
      canvasRef.current.height = view_width;
      canvasRef.current.style.height = view_width + 'px';
    }

    vs = view_width >= view_height ? view_height : view_width

    ctx = canvasRef.current.getContext('2d');
    viewcenterx = view_width * 0.5;
    viewcentery = view_height * 0.5;
    //arrowoffset = arrowCalculatedSize[1] * 5;
    arrowCalculatedSize = [vs / (25 * ppm) * arrowsize[0], vs / (25 * ppm) * arrowsize[1]]
    frame_radius = (vs - arrowoffset - arrowsize[1]*.5*ppm) / ppm / 2;
    wheel_radius = frame_radius - frame_radius/100*wheel_frame_size;
    //wheel_radius = (vs - vs / 2 / 100 - wheel_border_width*2  - (arrowCalculatedSize[1] - arrowoffset)*ppm) / ppm / 2;
    btn_radius = wheel_radius / 4;
    pin_radius_calculated = wheel_radius / 10 * pin_radius;
    pin_distance = wheel_radius - arrowCalculatedSize[1] * .85 + arrowoffset + pin_radius_calculated * 2;
    physicswidth = (view_width) / ppm;
    physicsheight = view_height / ppm;
    physicscenterx = physicswidth * 0.5;
    physicscentery = physicsheight * 0.5 - arrowoffset + arrowsize[1]*.25;
    if(canvas_bg_img){
      canvas_img =  document.createElement('img');
      canvas_img.src = canvas_bg_img;
    }
  }

  function updateMouseBodyPosition(e) {
    e.persist();
    const p = getPhysicsCoord(e);
    if (typeof mousebody === 'undefined') {
      return false;
    }
    mousebody.position[0] = p.x;
    mousebody.position[1] = p.y;
    if (world.hitTest(mousebody.position, [btnInstance.body])[0]) {
      ctx.canvas.style.cursor = 'pointer'
    } else {
      ctx.canvas.style.cursor = 'default'
    }

    if (e.type === "touchmove" && !touchstart) {
      checkStartDrag();
      initSounds();
    }
  }

  function checkSpin() {
    return wheel_spinned === false && wheel_stopped === true
      && (typeof tries === "number" && tries > 0);
  }

  function checkStartDrag() {
    touchstart = true;
    if (manual_spin && checkSpin() && world.hitTest(mousebody.position, [wheelInstance.body])) {
      mouseconstraint = new p2.RevoluteConstraint(mousebody, wheelInstance.body, {
        worldPivot      : mousebody.position,
        collideConnected: false
      });
      world.addConstraint(mouseconstraint);
    }
  }

  function checkClick() {
    initSounds()
    if (checkSpin() && world.hitTest(mousebody.position, [btnInstance.body])[0]) {
      spin();
    }
  }

  function checkEndDrag(e) {
    touchstart = false;
    if (manual_spin && checkSpin() && mouseconstraint) {
      world.removeConstraint(mouseconstraint);
      mouseconstraint = null;
      if (Math.abs(wheelInstance.body.angularVelocity) > min_manual_spin_velocity) {
        tooweak = false;
        spin(wheelInstance.body.angularVelocity)
      } else {
        tooweak = true;
        if (!world.hitTest(mousebody.position, [btnInstance.body])[0]) {
          trigger("tooweak");
          wheel_spinned = true;
          wheel_stopped = false;
        }

      }
    }
  }

  function getPhysicsCoord(e) {
    if (!canvasRef.current) {
      return {
        x: 0, y: 0
      }
    }

    const {touches} = e;
    const {clientX, clientY} = ((touches && touches[0]) || e);
    let rect = canvasRef.current.getBoundingClientRect(),
      x = (clientX - rect.left) / ppm,
      y = physicsheight - (clientY - rect.top) / ppm;

    return {x: x, y: y};
  }

  function getPhysicsDimentions() {
    return {
      wheelx: physicscenterx,
      wheely: physicscentery,//wheel_radius + 4,
      arrowx: physicscenterx,
      arrowy: physicscentery + wheel_radius + arrowoffset
    }
  }

  function initPhysics() {
    world = new p2.World();
    world.solver.iterations = 100;
    world.solver.tolerance = 0;

    arrow_material = new p2.Material();
    pin_material = new p2.Material();
    btn_material = new p2.Material();
    contact_material = new p2.ContactMaterial(arrow_material, pin_material, btn_material, {
      friction   : 0.0,
      restitution: 0.1
    });
    world.addContactMaterial(contact_material);

    const
      {
        wheelx,
        wheely,
        arrowx,
        arrowy
      } = getPhysicsDimentions();


    wheelInstance = new Wheel(wheelx, wheely, wheel_radius, segments, pin_radius_calculated, pin_distance);

    if(wheel_frame){
      frame = new Frame(wheelx, wheely, vs / ppm / 2, wheel_frame);
    }

    arrowInstance = new Arrow(arrowx, arrowy, arrowCalculatedSize[0], arrowCalculatedSize[1], arrowimage);

    btnInstance = new Button(wheelx, wheely, wheel_radius / 4, btn_image)

    mousebody = new p2.Body();

    world.addBody(mousebody);

    world.on("endContact", function (evt) {
      try {
        sounds.click.ref.current.currentTime = 0;
        sounds.click.ref.current.volume = click.volume;
        sounds.click.ref.current.play().catch(console.warn);
      } catch (e) {
        !!console && console.warn('e')
      }
    });

    //initial wheel rotation and speed
    resetWheel();
  }

  function spawnPartices() {

    if (!particles) {
      return false;
    }

    sounds.salute.ref.current.currentTime = 0;
    sounds.salute.ref.current.volume = salute.volume;
    sounds.salute.ref.current.play().catch(console.warn);

    const {
      amount = 200
    } = particles;

    for (let i = 0; i < amount; i++) {
      let p0 = new Point(viewcenterx, viewcentery - 64);
      let p1 = new Point(viewcenterx, 0);
      let p2 = new Point(Math.random() * view_width, Math.random() * viewcentery);
      let p3 = new Point(Math.random() * view_width, view_height + 64);
      particlesArr.push(new Particle(p0, p1, p2, p3));
    }
  }

  function update() {

    const won = wheelInstance.gotLucky();

    particlesArr.forEach(function (p) {
      p.update();
      if (p.complete) {
        particlesArr.splice(particlesArr.indexOf(p), 1);
      }
    });

    // p2 does not support continuous collision detection :(
    // but stepping twice seems to help
    // considering there are only a few bodies, this is ok for now.
    world.step(timestep * 0.5);

    // trigger change segment
    if (segment !== currentSegment()) {
      segment = currentSegment();
      const _d = {
        segment: segment
      }
      trigger('segmentchange', _d);
    }

    /*if (wheelInstance.hasStopped() && !wheel_stopped) {
      trigger('stopped', {
        section: currentSegment()
      });
    }*/
    if (wheel_spinned && wheelInstance.hasStopped() && tooweak) {

      trigger('stopped_weak', {
        section: currentSegment()
      });

      wheel_spinned = false;
      wheel_stopped = true;
    }

    if (
      ((!!win && wheelInstance.step) || !win)
      && (wheelInstance.hasStopped()
      && wheel_spinned
      && arrowInstance.hasStopped())
    ) {
      trigger('stopped', {
        section: currentSegment()
      });

      if (currentSegment() !== no_win_segment) {

        // win
        sounds.wining.ref.current.currentTime = 0;
        sounds.wining.ref.current.volume = wining.volume;
        sounds.wining.ref.current.play().catch(console.warn);
        spawnPartices();
        trigger('win', {
          section: currentSegment()
        });
      } else {
        //losingAudio
        sounds.lose.ref.current.currentTime = 0;
        sounds.lose.ref.current.volume = lose.volume;
        sounds.lose.ref.current.play().catch(console.warn);
        trigger('lose', {
          section: currentSegment()
        });
      }

      if (won) {
        wheelInstance.body.inertia = 0.2;
        wheelInstance.body.angularVelocity = 0;
      }

      if (typeof tries === "number") {
        tries--;
      }

      wheel_spinned = false;
      wheel_stopped = true;
    }
  }

  function draw(t) {
    // ctx.fillStyle = '#fff';
    ctx.clearRect(0, 0, view_width, view_height);

    if(canvas_bg_color){
      ctx.fillStyle = canvas_bg_color;
      ctx.fillRect(0,0,view_width,view_height)
    }
    if(canvas_img && canvas_bg_img){
      ctx.drawImage(canvas_img, 0, 0, view_width,view_height);
    }

    wheelInstance.update(t);
    //wheelInstance.draw();
    if(frame) {
      frame.draw();
    }
    arrowInstance.draw();
    btnInstance.draw();
    particlesArr.forEach(function (p) {
      p.draw();
    });
  }

  function loop(t) {
    update(t - timestamp);
    draw(t - timestamp);
    timestamp = t;
    requestAnimationFrame(loop);
  }

  function resetWheel() {
    wheelInstance.body.angularVelocity = parseFloat(initial_spin);
    wheelInstance.body.angle = (Math.PI / 12.5);

    btnInstance.body.angularVelocity = parseFloat(initial_spin)*.5;
    tooweak = false;
  }

  const spin = (speed = -(Math.random() * 10 + 20)) => {
    resetWheel();
    const sign = Math.sign(speed);
    if (!!win) {
      const circlesToWin = Math.ceil(3 + Math.random() * 5) * two_pi;
      const endAngle = sign * circlesToWin + win * delta_pi - delta_pi + delta_pi * Math.random() * .18 * randomSign();
      wheelInstance.start(wheelInstance.body.angle, endAngle, radtodeg(circlesToWin * (.2 + Math.random() * .2)));

      btnInstance.body.angularVelocity = angularVelocity(wheelInstance.body.angle * sign, .5);
    } else {
      wheelInstance.body.angularVelocity = speed;
      btnInstance.body.angularVelocity = speed / 20;
    }
    wheel_spinned = true;
    wheel_stopped = false;
    trigger('spinstart');
  };

  function initSounds() {
    Object.keys(sounds).forEach(s => {
      if (sounds[s].initiated) {
        return false;
      }
      sounds[s].ref.current.currentTime = 0;
      sounds[s].ref.current.volume = sounds[s].volume;
      sounds[s].ref.current.muted = false;
      sounds[s].initiated = true;
      /*sounds[s].ref.current.play().then(() => {
        sounds[s].ref.current.pause();
      }).catch(console.warn);*/
    });
  }

/////////////////////////////
// wheel of fortune
/////////////////////////////
  function Wheel(x, y, radius, segments, pin_r, pin_distance) {

    this.x = x;
    this.y = y;
    this.radius = radius;
    this.segments = segments;

    this.step = 0;
    this.startAngle = 0;
    this.endAngle = 0;
    this.duration = 0;

    this.pin_radius = pin_r;
    this.pin_distance = pin_distance;

    this.px = this.x * ppm;
    this.py = (physicsheight - this.y) * ppm;

    this.pRadius = this.radius * ppm;
    this.pPinRadius = this.pin_radius * ppm;
    this.pPinPositions = [];

    // cache canvas
    this.canvas = document.createElement('canvas');

    this.delta_pi = two_pi / this.segments;
    //wheel_image
    this.image = wheel_image && document.createElement('img');
    if (this.image) {
      this.image.src = wheel_image;
    } else {
      this.pRadius = this.pRadius - wheel_border_width
    }

    this.createBody();
    this.createPins();
  }

  Wheel.prototype = {
    createBody    : function () {
      this.body = new p2.Body({mass: wheel_mass, position: [this.x, this.y]});
      this.body.angularDamping = 0;
      this.body.addShape(new p2.Circle(this.radius));
      this.body.shapes[0].sensor = true; //todo use collision bits instead

      this.axis = new p2.Body({position: [this.x, this.y]});
      this.constraint = new p2.LockConstraint(this.body, this.axis);
      this.constraint.collideConnected = false;

      world.addBody(this.body);
      world.addBody(this.axis);
      world.addConstraint(this.constraint);
    },
    createPins    : function () {
      let l = this.segments,
        pin = new p2.Circle(this.pin_radius);

      pin.material = pin_material;

      for (let i = 0; i < l; i++) {
        const b = this.pin_distance;

        const x = Math.cos(i / l * two_pi) * b,
          y = Math.sin(i / l * two_pi) * b;

        this.body.addShape(pin, [x, y]);

        this.pPinPositions[i] = [
          x * ppm, -y * ppm
        ];
      }
    },
    gotLucky      : function () {
      return !!win
        && currentSegment() === win
        && Math.round(Math.abs(this.body.angle)) === Math.round(Math.abs(this.endAngle - delta_pi / 2 * Math.sign(this.endAngle)))
        && this.endAngle !== 0
        && this.hasStopped();
    },
    drawPins      : function (p) {
      if (!render_pins) {
        return false;
      }

      if (wheel_pin_color instanceof Array) {
        const pin_gradient = ctx.createRadialGradient(p[0], p[1], this.pPinRadius, p[0] + this.pPinRadius / 3, p[1], this.pPinRadius / 3);
        const o = 100 / (wheel_pin_color.length - 1);
        for (let i = 0; i < wheel_pin_color.length - 1; i++) {
          const pc = wheel_pin_color[i];
          pin_gradient.addColorStop(i * o / 100, pc);
        }
        pin_gradient.addColorStop(1, wheel_pin_color[wheel_pin_color.length - 1]);
        this.ctx.fillStyle = pin_gradient;
      } else {
        this.ctx.fillStyle = wheel_pin_color;
      }

      this.ctx.beginPath();
      this.ctx.arc(p[0], p[1], this.pPinRadius, 0, two_pi);
      this.ctx.closePath();
      this.ctx.fill();

    },
    draw          : function () {
      ctx.save();

      if (!this.ctx && (!this.image || (this.image && this.image.complete)))  {
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.pRadius * 2;
        this.canvas.height = this.pRadius * 2;
        this.ctx.translate(this.pRadius, this.pRadius);
        if (this.image) {
          this.ctx.drawImage(this.image, -this.pRadius, -this.pRadius, this.pRadius * 2, this.pRadius * 2);

        } else {
          this.ctx.beginPath();
          this.ctx.linejoin = 'round';
          this.ctx.fillStyle = wheel_bg_color;
          this.ctx.strokeStyle = wheel_border_color;
          this.ctx.arc(0, 0, this.pRadius-wheel_border_width, 0, two_pi);
          this.ctx.closePath();
          this.ctx.fill();

          if(wheel_border_color){
            this.ctx.lineWidth = wheel_border_width;
            this.ctx.stroke();
          }

          //segments
          for (let i = 0; i < this.segments; i++) {
            this.ctx.fillStyle = (wheel_slice_colors && wheel_slice_colors[(i % 2 === 0) + 0]) || "#ffffff";
            this.ctx.lineWidth = wheel_slice_border_width;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.pRadius-wheel_border_width, i * this.delta_pi, (i + 1) * this.delta_pi);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
          }

        }
        // pins
        if (!!render_pins) {
          this.pPinPositions.forEach(this.drawPins, this);
        }
      }

      ctx.translate(this.px, this.py);
      ctx.rotate(-this.body.angle);
      ctx.drawImage(this.canvas, -this.pRadius, -this.pRadius);
      ctx.restore();
    },
    start         : function (startAngle = wheelInstance.body.angle, endAngle = two_pi, duration = 360) {
      this.startAngle = startAngle;
      this.endAngle = endAngle;
      this.duration = Math.round(duration);
      this.step = 0;
    },
    update        : function (t) {
      if (!!win && this.step < this.duration) {
        const _a = ease.easeoutquart(this.step, this.startAngle, this.endAngle, this.duration);
        this.body.angle = _a;
        this.body.angularVelocity = angularVelocity(_a - this.body.angle, t / 1000);
        this.step++;
      }
      this.rotationDirection = Math.sign(wheelInstance.body.angularVelocity);
      this.draw();
    },
    hasStopped    : function ()  {
      const ws = Math.abs(wheelInstance.body.angularVelocity) < 0.05 || Math.sign(wheelInstance.body.angularVelocity) !== this.rotationDirection;
      if (tooweak) {
        return ws;
      }
      if (!!win) {
        return this.step === this.duration && this.step !== 0 && Math.abs(this.body.angularVelocity) < 0.05
      }
      return ws;
    },
    updatePosition: function (x, y, radius, pin_r, pin_distance) {
      if(!!this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      delete this.ctx;
      this.x = x;
      this.y = y;
      this.radius = radius;

      this.pin_radius = pin_r;
      this.pin_distance = pin_distance;

      this.px = this.x * ppm;
      this.py = (physicsheight - this.y) * ppm;

      this.pRadius = this.radius * ppm;

      this.pRadius = this.radius * ppm;
      this.pPinRadius = this.pin_radius * ppm;

      this.body.position = [this.x, this.y];
      this.axis.position = [this.x, this.y];

      this.body.shapes[0].radius = this.radius;
      this.body.shapes[0].boundingRadius = this.radius;

      const {segments, pin_distance: pd} = this;

      for (let i = 0; i < segments; i++) {
        const b = pd;

        const x = Math.cos(i / segments * two_pi) * b,
          y = Math.sin(i / segments * two_pi) * b;

        this.body.shapes[i + 1].radius = this.pin_radius;
        this.body.shapes[i + 1].boundingRadius = this.pin_radius;
        this.body.shapeOffsets[i + 1] = [x, y];
        this.pPinPositions[i] = [
          x * ppm, -y * ppm
        ];
      }
    }
  };
/////////////////////////////
// arrow on top of the wheel of fortune
/////////////////////////////
  function Arrow(x, y, w, h, skin) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.verts = [];

    this.px = this.x * ppm;
    this.py = (physicsheight - this.y) * ppm;
    this.pverts = [];
    // cache canvas
    this.canvas = document.createElement('canvas');

    this.createBody();
    this.image = skin && document.createElement('img');
    if (this.image) {
      this.image.src = skin;
    }
  }

  Arrow.prototype = {
    createBody      : function () {
      this.body = new p2.Body({
        mass          : arrowmass,
        angularDamping: (vs / 2) / (this.w * ppm) / 6.5,
        position      : [this.x, this.y]
      });
      this.body.addShape(this.createarrowshape());

      this.axis = new p2.Body({position: [this.x, this.y]});
      this.constraint = new p2.RevoluteConstraint(this.body, this.axis, {
        worldPivot: [this.x, this.y]
      });
      this.constraint.collideConnected = false;

      this.leftAncor = new p2.Body({position: [this.x - 2, this.y]});
      this.rightAncor = new p2.Body({position: [this.x + 2, this.y]});

      this.leftconstraint = new p2.DistanceConstraint(this.body, this.leftAncor, {
        localAnchorA    : [-this.w * 2, this.h * 0.25],
        collideConnected: false
      });
      this.rightconstraint = new p2.DistanceConstraint(this.body, this.rightAncor, {
        localAnchorA    : [this.w * 2, this.h * 0.25],
        collideConnected: false
      });
      let s = 32,
        r = 4;

      this.leftconstraint.setStiffness(s);
      this.leftconstraint.setRelaxation(r);
      this.rightconstraint.setStiffness(s);
      this.rightconstraint.setRelaxation(r);

      world.addBody(this.body);
      world.addBody(this.axis);
      world.addConstraint(this.constraint);
      world.addConstraint(this.leftconstraint);
      world.addConstraint(this.rightconstraint);
    },
    createarrowshape: function () {

      this.verts[0] = [0, this.h * 0.25];
      this.verts[1] = [-this.w * 0.5, this.h * 0.15];
      this.verts[2] = [0, -this.h * 0.7];
      this.verts[3] = [this.w * 0.5, this.h * 0.25];

      this.pverts[0] = [this.verts[0][0] * ppm, -this.verts[0][1] * ppm];
      this.pverts[1] = [this.verts[1][0] * ppm, -this.verts[1][1] * ppm];
      this.pverts[2] = [this.verts[2][0] * ppm, -this.verts[2][1] * ppm];
      this.pverts[3] = [this.verts[3][0] * ppm, -this.verts[3][1] * ppm];

      let shape = new p2.Convex(this.verts);
      shape.material = arrow_material;

      return shape;
    },
    hasStopped      : function () {
      let angle = Math.abs(this.body.angle % two_pi);
      return radtodeg(angle) <= arrowstop;
    },
    update          : function () {},
    draw            : function () {
      ctx.save();

      if (!this.ctx && (!this.image || (this.image && this.image.complete))) {
        this.ctx = this.canvas.getContext('2d');

        this.canvas.width = Math.abs(this.pverts[3][0]) + Math.abs(this.pverts[1][0]);
        this.canvas.height = Math.abs(this.pverts[0][1]) + Math.abs(this.pverts[2][1]);
        this.ctx.translate(0, 0);

        if (this.image && this.image.complete) {
          this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
        } else {

          this.ctx.fillStyle = wheel_arrow_color;

          this.ctx.beginPath();
          this.ctx.moveTo(this.pverts[0][0], this.pverts[0][1]);
          this.ctx.lineTo(this.pverts[1][0], this.pverts[1][1]);
          this.ctx.lineTo(this.pverts[2][0], this.pverts[2][1]);
          this.ctx.lineTo(this.pverts[3][0], this.pverts[3][1]);
          this.ctx.closePath();
          this.ctx.fill();
        }

      }
      ctx.translate(this.px, this.py);
      ctx.rotate(-this.body.angle);
      ctx.drawImage(this.canvas, this.pverts[1][0], this.pverts[0][1]);

      ctx.restore();
    },
    updatePosition  : function (x, y, w, h) {
      if(!!this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      delete this.ctx;
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;

      this.px = this.x * ppm;
      this.py = (physicsheight - this.y) * ppm;
      this.verts[0] = [0, this.h * 0.15];
      this.verts[1] = [-this.w * 0.5, this.h * 0.15];
      this.verts[2] = [0, -this.h * 0.7];
      this.verts[3] = [this.w * 0.5, this.h * 0.15];

      this.pverts[0] = [this.verts[0][0] * ppm, -this.verts[0][1] * ppm];
      this.pverts[1] = [this.verts[1][0] * ppm, -this.verts[1][1] * ppm];
      this.pverts[2] = [this.verts[2][0] * ppm, -this.verts[2][1] * ppm];
      this.pverts[3] = [this.verts[3][0] * ppm, -this.verts[3][1] * ppm];

      //this.body.position = [this.x, this.y];

      /*this.body = {...this.body,
        position: [this.x, this.y],
        mass: arrowmass,
        angularDamping: (vs / 2) / (this.w * ppm) / 6.5
      }*/

      this.body.position = [this.x, this.y];
      this.body.angularDamping = (vs / 2) / (this.w * ppm) / 6.5;

      this.axis.position = [this.x, this.y];


      for (let v = 0; v < this.verts.length; v++) {
        this.body.shapes[0].vertices[v][0] = this.verts[v][0]
        this.body.shapes[0].vertices[v][1] = this.verts[v][1]
      }

      this.body.shapes[0].updateTriangles();
      this.body.shapes[0].updateCenterOfMass();
      this.body.shapes[0].updateBoundingRadius();
      this.body.shapes[0].updateArea();

      this.leftAncor.position = [this.x - 2, this.y];
      this.rightAncor.position = [this.x + 2, this.y];

      this.leftconstraint.localAnchorA = [-this.w * 2, this.h * 0.25];
      this.rightconstraint.localAnchorA = [this.w * 2, this.h * 0.25];


      this.constraint.worldPivot = [this.x, this.y];
    }
  };

  function Button(x, y, radius, skin) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.px = this.x * ppm;
    this.py = (physicsheight - this.y) * ppm;
    this.pRadius = this.radius * ppm;
    this.canvas = document.createElement('canvas');

    this.image = skin && document.createElement('img');
    if (this.image) {
      this.image.src = skin;
    }

    this.createBody();
  }

  Button.prototype = {
    createBody    : function () {
      this.body = new p2.Body({
        mass: 1, position: [this.x, this.y]
      });
      this.body.angularDamping = 0.3;
      this.body.addShape(new p2.Circle(this.radius));
      this.body.shapes[0].sensor = true; //todo use collision bits instead

      this.axis = new p2.Body({position: [this.x, this.y]});
      this.constraint = new p2.LockConstraint(this.body, this.axis);
      this.constraint.collideConnected = false;

      world.addBody(this.body);
      world.addBody(this.axis);
      world.addConstraint(this.constraint);
    },
    draw          : function () {
      ctx.save();

      if (!this.ctx && (!this.image || (this.image && this.image.complete))) {
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.pRadius * 2;
        this.canvas.height = this.pRadius * 2;

        this.ctx.translate(this.pRadius, this.pRadius);


        if (this.image) {
          this.ctx.shadowColor = btn_shadow;

          this.ctx.shadowBlur = 6;
          this.ctx.shadowOffsetx = 1;
          this.ctx.shadowOffsety = 1;
          this.ctx.drawImage(this.image, -this.pRadius, -this.pRadius, this.pRadius * 2, this.pRadius * 2);
        } else {
          this.ctx.beginPath();
          //ctx.strokeStyle = btn_stroke_color;
          this.ctx.lineWidth = 2;
          this.ctx.fillStyle = btn_color;
          this.ctx.shadowColor = btn_stroke_color;
          this.ctx.shadowBlur = 3;

          this.ctx.arc(0, 0, this.pRadius, 0, two_pi);
          this.ctx.closePath();
          this.ctx.fill();
          //ctx.stroke();
        }
      }

      ctx.translate(this.px, this.py);
      ctx.rotate(-this.body.angle);
      ctx.drawImage(this.canvas, -this.pRadius, -this.pRadius);
      ctx.restore();
    },
    updatePosition: function (x, y, radius) {
      if(!!this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      delete this.ctx;
      this.x = x;
      this.y = y;
      this.radius = radius;

      this.px = this.x * ppm;
      this.py = (physicsheight - this.y) * ppm;

      this.pRadius = this.radius * ppm;

      this.body.position = [this.x, this.y];
      this.body.shapes[0].radius = this.radius;
      this.body.shapes[0].boundingRadius = this.radius;
      this.axis.position = [this.x, this.y];
    }
  };

  function Frame(x, y, radius, skin) {
    this.x = x;
    this.y = y;
    this.radius = radius - wheel_border_width / ppm / 2;
    this.radius = radius - wheel_border_width / ppm / 2;
    this.px = this.x * ppm;
    this.py = (physicsheight - this.y) * ppm;
    this.pRadius = this.radius * ppm;
    this.canvas = document.createElement('canvas');

    this.image = skin && document.createElement('img');
    if (this.image) {
      this.image.src = skin;
    }

  }

  Frame.prototype = {
    draw          : function () {
      // todo this should be cached in a canvas, and drawn as an image
      // also, more doodads
      ctx.save();
      if (!this.ctx && (!this.image || (this.image && this.image.complete))) {
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.pRadius * 2;
        this.canvas.height = this.pRadius * 2;
        this.ctx.translate(this.pRadius, this.pRadius);

        if (this.image) {
          this.ctx.drawImage(this.image, -this.pRadius, -this.pRadius, this.pRadius * 2, this.pRadius * 2);
        } else {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, this.pRadius - wheel_border_width / ppm * 2, 0, two_pi);
          this.ctx.closePath();
          this.ctx.fill();
        }
      }
      ctx.translate(this.px, this.py);
      ctx.drawImage(this.canvas, -this.pRadius, -this.pRadius);
      ctx.restore();
    },
    updatePosition: function (x, y, radius) {
      if(!!this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      delete this.ctx;
      this.x = x;
      this.y = y;
      this.radius = radius;

      this.px = this.x * ppm;
      this.py = (physicsheight - this.y) * ppm;

      this.pRadius = this.radius * ppm;
    }
  };

/////////////////////////////
// your reward
/////////////////////////////
  function Particle(p0, p1, p2, p3) {
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;

    this.time = 0;
    this.duration = 3 + Math.random() * 2;
    this.color = 'hsl(' + Math.floor(Math.random() * 360) + ',100%,50%)';

    this.w = 10;
    this.h = 7;

    this.complete = false;
  };
  Particle.prototype = {
    update: function () {
      this.time = Math.min(this.duration, this.time + timestep);

      let f = ease.outcubic(this.time, 0, 1, this.duration);
      let p = cubebezier(this.p0, this.p1, this.p2, this.p3, f);

      let dx = p.x - this.x;
      let dy = p.y - this.y;

      this.r = Math.atan2(dy, dx) + half_pi;
      this.sy = Math.sin(Math.PI * f * 10);
      this.x = p.x;
      this.y = p.y;

      this.complete = this.time === this.duration;
    },
    draw  : function () {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.r);
      ctx.scale(1, this.sy);

      ctx.fillStyle = this.color;
      ctx.fillRect(-this.w * 0.5, -this.h * 0.5, this.w, this.h);

      ctx.restore();
    }
  };

  function Point(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  };
/////////////////////////////
// math
/////////////////////////////
  /**
   * easing equations from http://gizma.com/easing/
   * t = current time
   * b = start value
   * c = delta value
   * d = duration
   */
  let ease = {
    incubic     : function (t, b, c, d) {
      t /= d;
      return c * t * t * t + b;
    },
    outcubic    : function (t, b, c, d) {
      t /= d;
      t--;
      return c * (t * t * t + 1) + b;
    },
    inoutcubic  : function (t, b, c, d) {
      t /= d / 2;
      if (t < 1) return c / 2 * t * t * t + b;
      t -= 2;
      return c / 2 * (t * t * t + 2) + b;
    },
    easeoutquart: function (t, b, c, d) {
      t /= d;
      t--;
      return -c * (t * t * t * t - 1) + b;
    },
    inback      : function (t, b, c, d, s) {
      s = s || 1.70158;
      return c * (t /= d) * t * ((s + 1) * t - s) + b;
    },

  };

  function cubebezier(p0, c0, c1, p1, t) {
    let p = new Point();
    let nt = (1 - t);

    p.x = nt * nt * nt * p0.x + 3 * nt * nt * t * c0.x + 3 * nt * t * t * c1.x + t * t * t * p1.x;
    p.y = nt * nt * nt * p0.y + 3 * nt * nt * t * c0.y + 3 * nt * t * t * c1.y + t * t * t * p1.y;

    return p;
  }

  function angularVelocity(lambda, t) {
    return lambda / t;
  }

  function wheelDirection() {
    return !!wheelInstance && wheelInstance.body ? Math.abs(wheelInstance.body.angle) / wheelInstance.body.angle : 1;
  }

  function currentRotation() {
    const rotation = wheelInstance ? wheelInstance.body.angle % two_pi : 0;
    return wheelInstance && wheelInstance.body ? rotation : 0
  }

  function currentSegment() {
    const delta_pi = two_pi / segments;
    const mathsign = wheelDirection();
    const segmentv = Math.ceil(Math.abs(currentRotation() / delta_pi) * mathsign);
    const segment = Math.abs(mathsign > 0 ? segmentv : segments + segmentv);

    return segment;
  }

  /*function degtorad(deg) {
    return deg * Math.PI / 180
  }*/

  function radtodeg(rad) {
    return rad * 180 / Math.PI
  }

  function randomSign() {
    return Math.random() < 0.5 ? -1 : 1;
  }


  // init wheel
  useEffect(() => {
    initCanvasRef();
    initPhysics();
    requestAnimationFrame(loop);

    sounds.click.ref.current.volume = 0;
    sounds.wining.ref.current.volume = 0;
    sounds.salute.ref.current.volume = 0;
    sounds.lose.ref.current.volume = 0;


    var ro = new ResizeObserver(entries => {
      entries.forEach (() => {
        initCanvasRef();
        const
          {
            wheelx,
            wheely,
            arrowx,
            arrowy
          } = getPhysicsDimentions();
        frame.updatePosition(wheelx, wheely, frame_radius);
        wheelInstance.updatePosition(wheelx, wheely, wheel_radius, pin_radius_calculated, pin_distance);
        arrowInstance.updatePosition(arrowx, arrowy, arrowCalculatedSize[0], arrowCalculatedSize[1]);
        btnInstance.updatePosition(wheelx, wheely, btn_radius);
      })
    });

// Observe one or multiple elements
    ro.observe(canvasRef.current);

    trigger('render');
    // eslint-disable-next-line
  }, []);

  const canvasProps = {
    id   : `${idPrefix}_drawing_canvas`,
    ref  : canvasRef,
    style: {
      width : view_width,
      height: view_height,
    }
  };

  return (
    <div id={`${idPrefix}_container`} className={'wheel_container centered'} style={{
      width: view_width,
    }}>
      <canvas ref={canvasRef} {...canvasProps}
              onMouseMove={updateMouseBodyPosition}
              onTouchMove={updateMouseBodyPosition}
              onMouseDown={checkStartDrag}
              onMouseUp={checkEndDrag}
              onMouseOut={checkEndDrag}
              onTouchEnd={e => {
                e.persist();
                checkEndDrag(e);
                //checkClick(e);
              }}
              onClick={checkClick}
              crossOrigin="anonymous"
      ></canvas>
      {
        ['click',
          'wining',
          'salute',
          'lose',].map(s => {
          return <audio key={s} src={sounds[s].src} ref={sounds[s].ref} preload={"auto"} muted={true}/>
        })
      }
    </div>
  );
}

export default App;
