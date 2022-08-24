This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

#### Click [here](https://static.sunbingo.co.uk/utils/apps-react/out/fortunewheel/sunbingo/build) for wheel preview

## Available Scripts

In "apps-react" directory

### Start development – `[npm|yarn] run startapp fortunewheel [brand configuration]`
Will run development server on url http://utils.{brand domain}:3000/utils/apps-react/out/fortunewheel/{brand configuration}/build<br/>
Note that utils.{brand domain} should point to utils on localhost in vhost for development

### Make production build – `[npm|yarn] run build fortunewheel [brand configuration]`
Will create a production ready build and copy it to url /utils/apps-react/out/fortunewheel/{brand configuration/build<br/>
It will be reachable under https://static.{brand domain}/utils/apps-react/out/fortunewheel/{brand configuration}/build url<br/>


Available brands' configurations:<br />
"winnercom"<br />
"winner.uk"<br />
"placard"<br />
"ptstaging3.12"<br />
"marca"<br />
"maxbet"<br />
"sunbingo"<br />
"sunbingo_v2"<br />
"fabulousbingo"<br />
"tropez"<br />
"titancom"<br />
"europa"<br />
"caliente"<br />
"jstest"<br />
Can be viewed/changed/added in `utils/apps-react/scripts/AppVars.js`


## Usage
1. Add `<div id="wheel_root"></div>` in your html - the widget will be rendered inside it.<br/>
2. Add stylesheet in document's header `<link href="https://static.sunbingo.co.uk/utils/apps-react/out/fortunewheel/sunbingo_v2/build/static/css/main.7ace853d.chunk.css" rel="stylesheet">`
3. Add the following scripts to your page before `</body>`<br/>
  Optional - `<script type="text/javascript"> window.WheelConfig = window.WheelConfig || { /*  wheel configuration object  */ } </script>`<br/>
  `<script src="https://static.sunbingo.co.uk/utils/apps-react/out/fortunewheel/sunbingo_v2/build/static/js/runtime-main.f4c68b2e.js"></script>`<br/>
  `<script src="https://static.sunbingo.co.uk/utils/apps-react/out/fortunewheel/sunbingo_v2/build/static/js/2.3b071432.chunk.js"></script>`<br/>
  `<script src="https://static.sunbingo.co.uk/utils/apps-react/out/fortunewheel/sunbingo_v2/build/static/js/main.1666c83a.chunk.js"></script>`<br/>
4. Exact scripts can be found in exported folder in index.html file.<br/>
   Example: utils/apps-react/out/fortunewheel/sunbingo_v2/build/index.html

_Wheel will trigger state events and/or invoke callbacks passed from configuration. Check `events` configuration options for more details._<br/><br/>

### Events
Events can be passed as configurable options (see below) or can be bound with addEventListener to canvas element

`document.getElementById('wheel_drawing_canvas').addEventListener("wheel_stopped", function(evt){ console.log(evt.detail) })`<br/><br/><br/>
Events' names are concatinated with `eventsPrefix` configuration follwed by underscore before event name<br/>
* Change segment - "render":  `${eventsPrefix}_render`.<br/>
  Default: "wheel_render", invoked on wheel render.<br/>
  
* Too weak - "tooweak":  `${eventsPrefix}_spinstart`.<br/>
  Default: "wheel_tooweak", invoked on manual spin attempt slower than "WheelConfig.wheel.min_manual_spin_velocity" value.<br/>
  
* Spin start - "spinstart":  `${eventsPrefix}_spinstart`.<br/>
  Default: "wheel_spinstart", invoked on spin start.<br/>
  
* Change segment - "segmentchange":  `${eventsPrefix}_segmentchange`.<br/>
  Default: "wheel_segmentchange", invoked on moving from segment to segment<br/>
  
* Wheel stopped - "stopped":  `${eventsPrefix}_stopped`.<br/>
  Default: "wheel_stopped", invoked on wheel reached final segment.<br/>
  Important - Section's value in details is relative to arrow's pivot point<br/>
  
* Wheel win  - "win":  `${eventsPrefix}_win`.<br/>
  Default: "wheel_win", invoked upon wheel and arrow fully stopped (check `arrowstop` option )<br/>
  
* Wheel Lose- "lose":  `${eventsPrefix}_lose`.<br/>
  Default: "wheel_lose", invoked upon winning the losing segment, `no_win_segment` option<br/>

**Note: When `no_win_segment` is different from 0 - the `win` event/callback will not trigger, instead `lose` event/callback will be used**
 
<br/>
 
### Optional configuration options and their defaults.
Declared within  window.WheelConfig
<pre>
window.WheelConfig = window.WheelConfig || {
    // @string - all wheel events will be triggered with this prefix followed by underscore. `wheel_win`, `wheel_stopped` etc 
    eventsPrefix: 'wheel',
    
    // @string - id of HTML elements that holds the canvas will be constructed with this prefix `${idPrefix}_container`
    idPrefix: 'wheel',
    
    // @number - allowed times user may spin the wheel. Setting to `false` will make infinite
    tries: 1,
    
    // @string | @number - initial canvas holder dimensions.
    view_width: '100%', // Can be overridden with `!important` in css
    view_height: 400, // dynamic value, changes according to bounding box width in order to keep canvas square
    
    // Wheel configurations
    wheel: {
        // @number - amount of segments on the wheel
        segments: 12,
        
        // @string - color of wheel's frame when there is no image specified
        // any canvas supported color format
        wheel_border_color: '#db9e36',
        
        // @number, percents of viewport width - wheel frame size
        wheel_border_width: 25,
        
        // @string | @array of strings - pin color
        // When array of colors provided - Radial gradient with those colors will be crated
        // any canvas supported color format
        wheel_pin_color: ['#dbb134', '#f0d462', '#ffe6c9'],
        
        // @string - color of wheel's arrow when there is no image specified
        // any canvas supported color format
        wheel_arrow_color: '#ffcc15',
        
        // @array of strings with two entries - odd/even colors for slices
        // More then two colors in the array will be ignored
        // Missing color will be replaced with white
        // any canvas supported color format
        wheel_slice_colors: ['#e51c22', '#ffffff'],
        
        // @number - slice border with
        wheel_slice_border_width: 4,
        
        // @number - physical mass of the wheel
        wheel_mass: 1,
        
        // @string - url of an image to be used as a wheel background
        // Must have same amount of segments as `segments` option above
        // first segment's left-top cornet must point at 00:00 o'clock 
        wheel_image: '/utils/apps-react/out/fortunewheel/sunbingo/build/assets/img/wheel-bg.png',
        
        // @string - url of an image to be used as a wheel frame background
        wheel_frame: '/utils/apps-react/out/fortunewheel/sunbingo/build/assets/img/wheel-brdr.png',
        
        // @number - Winning segment position, 1 based
        // First prize index is the top segment wheel rendered with
        // Prize's index increase with clock direction
        // Can be also added to url query parameter `w` as ?w=5, but setting the below has higher priority
        win: undefined,
        
        // @number - Index of losing segment, will play losing sound and trigger lose event
        no_win_segment: 0,
        
        // @number - Pin radius, percents of the wheel radius
        pin_radius: 0.2,
        
        // @boolean - when set to `false` the pins will not be shown on the wheel
        // Note: they will be still rendered for physics interactions, but will be rather invisible to user 
        render_pins: true,
        
        // @number - Minimum required velocity upon manual spinning
        min_manual_spin_velocity: 7.5
    },
    
    // Top arrow configurations
    {
        // @number - arrow stop threshold, when fully stopped arrow pointing down is 0º (deg)
        arrowstop: 8,
        
        // @array of numbers = arrow's dimensions [width, height]
        // Calculated in relation to viewport size by formula [vs / (25 * ppm) * arrowsize[0], vs / (25 * ppm) * arrowsize[1]]
        arrowsize: [2, 2],
        
        // @number - arrow's offset of the top canvas side
        arrowoffset: .5,
        
        // @number - physical mass of the arrow
        arrowmass: 1,
        
        // @string - url of an image to be used as an arrow's background
        arrowimage: '/utils/apps-react/out/fortunewheel/sunbingo/build/assets/img/arrow.svg',
    },
      
    // Trigger button configurations
    {
      // @string - button's color when there is no image provided
      // any canvas supported color format
      btn_color: '#ffffff',
      
      // @string - button's border color when there is no image provided
      // any canvas supported color format
      btn_stroke_color: '#333333',
      
      // @string - color for shadow around the button
      // any canvas supported color format, use rgba(255,255,255,0) for transparent
      btn_shadow: '#cccccc',
      
      // @string - url of an image to be used as an button's background
      btn_image: '/utils/apps-react/out/fortunewheel/sunbingo/build/assets/img/wheel-button.png',
    },
    
    // Sounds configuration 
    audio : {
        // Arrow touching pin
        click : {
          src   : '/utils/apps-react/out/fortunewheel/sunbingo/build/assets/sounds/click.m4a',
          volume: .1
        },
        
        // Winning
        wining: {
          src   : '/utils/apps-react/out/fortunewheel/sunbingo/build/assets/sounds/positive_winning.m4a',
          volume: .4
        },
        
        // Particles release
        salute: {
          src   : '/utils/apps-react/out/fortunewheel/sunbingo/build/assets/sounds/shoot.m4a',
          volume: .2
        },
        
        // Winning the losing segment
        lose  : {
          src   : '/utils/apps-react/out/fortunewheel/sunbingo/build/assets/sounds/lose.m4a',
          volume: .2
        }
    },
    
    // Particles configuration. 
    // When set to `false` particles won't trigger upon winning and no `salute` sound will be played
    particles: {
        // @number - amount of particles to render
        amount: 200
    },
    
    // @function - callbacks
    events: {
        // invoked when wheel has been rendered
        onrender: null,
        
        // invoked when wheel was spinned manually to a velocity less then "WheelConfig.wheel.min_manual_spin_velocity" value
        ontooweak: null,
        
        // invoked when wheel has started spinning
        onspinstart: null,
        
        // invoked when wheel has switched to different segment
        // Currently relative to arrow's pivot axis
        // May trigger with different segment index in data then the one arrow's tip is on
        onsegmentchange: null,
        
        // invoked when wheel has been stopped
        // Same as above, segment's index in data is relative to arrow's pivot point
        onstoppped: null,
        
        // invoked when wheel has been stopped and arrow has stopped (check arrow's stopping threshold option)
        onwin: null,
        
        // invoked when wheel has won a losing segment
        onlose: null,
    }
 }
</pre>

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `yarn build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
