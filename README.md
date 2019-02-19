# Simple JavaScript Boilerplate Project

This is a boilerplate project which configures:

- [Jasmine](https://jasmine.github.io/) as a testing framework (one example unit test can be found in `spec/src/project_name_spec.js`)
- [Karma](https://karma-runner.github.io/latest/index.html) as a test runner
- [Webdriver.io](https://webdriver.io/) for end to end tests (one example test can be found in `spec/features/hello_world_spec.js`)
- [Browserify](http://browserify.org/) to bundle everything (no webpack but simple and functional)
- [Google Closure Compiler](https://github.com/google/closure-compiler) for minimizing the bundled js file

It's intended for frontend projects which do not have server logic in the same code base.

## Why this Boilerplate?

While having a JavaScript break for 5 years a lot changed in this world. Two years ago, I wanted to start a new JavaScript project, not for learning purposes but to get a problem solved. This is the stack which worked for me after spending a few days of research.

There might be more modern solutions out there, but it seems to me that one have to spend quite a time to understand them. __Done is better than perfect.__

## Usage

### 1. Checkout the Project

```bash
git clone git@github.com:wolfoo2931/js-kick-off.git
mv js-kick-off [project-name]
cd [project-name]
```

### 2. Rename the Project

When you check out the project, the app is named "project-name". The following
commands will replace all occurrences of this name with `your-project-name` or `your_project_name`. Mind the `-` and `_` when putting in your favorit name.

```bash
sed -i '' 's/project-name/your-project-name/g' package.json
sed -i '' 's/project-name/your-project-name/g' package-lock.json

sed -i '' 's/project_name/your_project_name/g' package.json
sed -i '' 's/project_name/your_project_name/g' karma.conf.js
sed -i '' 's/project_name/your_project_name/g' spec/src/declarativ_forms_spec.js

mv ./spec/src/project_name_spec.js ./spec/src/your_project_name_spec.js
mv ./src/project_name.js ./src/your_project_name.js
```
### 3. Package your App into a single JS File

There are predefined tasks which package the code base into a single JS file. Just
execute:

```bash
npm run package
```

You will find the packaged file in `assets/`. I am usally checking the packaged file into the git repository. This way users can try out the app by simply open the assets/index.html file in their browser. They do not have to deal with the build process.

When executing:

```bash
npm run package:min
```

A minimized version of packaged file will be produced.


When executing:

```bash
npm run package:watch
```

The packaged file will be updated whenever something in the code base changes.

### 4. Run Unit Tests

While I am developing, I always run `npm run package:watch` in one terminal window. This will update the packaged file everytime I change something in the code base. The unit as well as the end to end tests will only test the packaged file.

Once `npm run package:watch` is running you simple have to execute:

```bash
npm test
```

### 5. Run End to End Tests

Ensure `npm run package:watch` and `npm run webdriver:start` are running before executing the e2e test suite by typing:

```bash
npm run test:browser
```

This boilerplate project includes an example e2e tests, so you can execute the command above and see the test running.

### 6. Open the App

The idea is to just open `assets/index.hml` in the browser. Ensure `npm run package`
has been executed.
