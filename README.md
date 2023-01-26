Fluence CLI
===

A tool that makes working with Fluence network more convenient

## Table of contents:

<!-- toc -->
* [Prerequisites](#prerequisites)
* [Usage](#usage)
* [Configs Documentation](#configs-documentation)
* [Currently supported workflow example](#currently-supported-workflow-example)
* [Contributing](#contributing)
* [Commands](#commands)
<!-- tocstop -->

# Prerequisites

- Linux or MacOS (currently have some bugs on windows)
- [Node.js >=16.0.0](https://nodejs.org/)

# Usage

```sh-session
$ npm install -g @fluencelabs/cli
$ fluence COMMAND
running command...
$ fluence
@fluencelabs/cli/0.0.0 linux-x64 node-v16.14.0
$ fluence --help [COMMAND]
USAGE
  $ fluence COMMAND
...
```

# Configs Documentation

[Documentation for all the configs that Fluence CLI uses can be found here](./docs/configs/README.md)

# Currently supported workflow example

1. Run `fluence service add 'https://github.com/fluencelabs/services/blob/master/adder.tar.gz?raw=true'` to add Adder service to your application. Fluence CLI will suggest you to init project if it wasn't already initialized. Choose `ts` template.
1. Run `fluence run -f 'helloWorld("Fluence")'` if you want to run `helloWorld` example aqua function from `src/aqua/main.aqua`.
1. Run `fluence deploy` to deploy the application described in `fluence.yaml`
1. Uncomment Adder and App aqua in `src/aqua/main.aqua`:
    ```aqua
    import App from "deployed.app.aqua"
    import Adder from "services/adder.aqua"
    export App, addOne

    -- snip --

    func addOne(x: u64) -> u64:
        services <- App.services()
        on services.adder.default!.peerId:
            Adder services.adder.default!.serviceId
            res <- Adder.addOne(x)
        <- res
    ```
    `"deployed.app.aqua"` file was generated after you ran `fluence deploy` and it is located at `.fluence/aqua/deployed.app.aqua`. 
    
    `App.services()` method returns ids of the previously deployed services that you can use in your aqua code (info about previously deployed services is stored at `.fluence/app.yaml`).

1. Run `fluence aqua` to compile `src/aqua/main.aqua` to typescript
1. Open `src/ts/src/index.ts` example file and uncomment newly generated imports and code that uses those imports
    ```ts
    import { addOne } from "./aqua/main.ts";
    import { registerApp } from "./aqua/app.ts";

    // ---snip---

      registerApp()
      console.log(await addOne(1))
    ```

1. Go to `src/ts` directory and run `npm run start`. All the functions from `src/aqua/main.aqua` will run and you will see:
    - `Hello, Fluence` as a result of `helloWorld("Fluence")`
    - `2` as a result of `addOne(1)`
1. Run `fluence remove` to remove the previously deployed fluence application

# Contributing

- To run cli in development mode use: `./bin/dev`
- To run cli in production mode run `npm run build` first, then use: `./bin/run`. If you wanna make sure you are running the actual package the users will use - do `npm run build`, `npm pack` and install this tar package (this approach is used for tests)
- If you are using nvm and want to commit using VSCode - place `.huskyrc` file to your Home directory
- Don't name arguments or flags with names that contain underscore symbols, because autogenerated links in markdown will not work
- pre-commit runs each time before you commit. It includes prettier and generates this README.md file that you are reading right now. 
- If you want README.md file to be correctly generated please don't forget to run `npm run build` before committing
- Don't export anything from command files except for the command itself. If you need to share code between commands - create a separate file
- Use `this.error` (or `commandObj.error`) for human readable errors. They will be reported to analytics as events. Use `throw new Error` (or `assert`) for unexpected errors. They will be reported to analytics as crashes.
- Don't use colors inside commands descriptions. They can't be rendered to markdown and they will not be rendered to users of the packaged CLI anyway, when they run --help

Pull request and release process:
1. Run `npm run check` to make sure everything ok with the code
1. Only after that commit your changes to trigger pre-commit hook that updates `README.md`. Read `README.md` to make sure it is correctly updated
1. Push your changes
1. Create pull request and merge your changes to `main`
1. Switch to `main` locally and pull merged changes
1. Run `git tag -a v0.0.0 -m ""` with version number that you want instead of `0.0.0`
1. Run `git push origin v0.0.0` with version number that you want instead of `0.0.0` to trigger release

# Commands

<!-- commands -->
* [`fluence aqua`](#fluence-aqua)
* [`fluence autocomplete [SHELL]`](#fluence-autocomplete-shell)
* [`fluence build`](#fluence-build)
* [`fluence dep cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dep-cargo-i-package-name--package-nameversion)
* [`fluence dep i`](#fluence-dep-i)
* [`fluence dep npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dep-npm-i-package-name--package-nameversion)
* [`fluence dependency cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dependency-cargo-i-package-name--package-nameversion)
* [`fluence dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dependency-cargo-install-package-name--package-nameversion)
* [`fluence dependency i`](#fluence-dependency-i)
* [`fluence dependency install`](#fluence-dependency-install)
* [`fluence dependency npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dependency-npm-i-package-name--package-nameversion)
* [`fluence dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dependency-npm-install-package-name--package-nameversion)
* [`fluence deploy`](#fluence-deploy)
* [`fluence help [COMMAND]`](#fluence-help-command)
* [`fluence init [PATH]`](#fluence-init-path)
* [`fluence key default [NAME]`](#fluence-key-default-name)
* [`fluence key new [NAME]`](#fluence-key-new-name)
* [`fluence key remove [NAME]`](#fluence-key-remove-name)
* [`fluence module add [PATH | URL]`](#fluence-module-add-path--url)
* [`fluence module new [PATH]`](#fluence-module-new-path)
* [`fluence module remove [NAME | PATH | URL]`](#fluence-module-remove-name--path--url)
* [`fluence remove`](#fluence-remove)
* [`fluence run`](#fluence-run)
* [`fluence service add [PATH | URL]`](#fluence-service-add-path--url)
* [`fluence service new [PATH]`](#fluence-service-new-path)
* [`fluence service remove [NAME | PATH | URL]`](#fluence-service-remove-name--path--url)
* [`fluence service repl [NAME | PATH | URL]`](#fluence-service-repl-name--path--url)

## `fluence aqua`

Compile aqua file or directory that contains your .aqua files

```
USAGE
  $ fluence aqua [-i <value>] [-o <value>] [--import <value>] [--air | --js] [--log-level-compiler
    <value>] [--const <value>] [--no-relay] [--no-xor] [--dry] [--scheduled] [-w] [--no-input]

FLAGS
  -i, --input=<path>            Path to an aqua file or an input directory that contains your .aqua files
  -o, --output=<path>           Path to the output directory. Will be created if it doesn't exists
  -w, --watch                   Watch aqua file or folder for changes and recompile
  --air                         Generate .air file instead of .ts
  --const=<NAME=value>...       Constants to be passed to the compiler
  --dry                         Checks if compilation is succeeded, without output
  --import=<path>...            Path to a directory to import from. May be used several times
  --js                          Generate .js file instead of .ts
  --log-level-compiler=<level>  Set log level for the compiler. Must be one of: Must be one of: all, trace, debug, info,
                                warn, error, off
  --no-input                    Don't interactively ask for any input from the user
  --no-relay                    Do not generate a pass through the relay node
  --no-xor                      Do not generate a wrapper that catches and displays errors
  --scheduled                   Generate air code for script storage. Without error handling wrappers and hops on relay.
                                Will ignore other options

DESCRIPTION
  Compile aqua file or directory that contains your .aqua files

EXAMPLES
  $ fluence aqua
```

_See code: [dist/commands/aqua.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.2.35/dist/commands/aqua.ts)_

## `fluence autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ fluence autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  display autocomplete installation instructions

EXAMPLES
  $ fluence autocomplete

  $ fluence autocomplete bash

  $ fluence autocomplete zsh

  $ fluence autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v1.3.6/src/commands/autocomplete/index.ts)_

## `fluence build`

Build all application services, described in fluence.yaml

```
USAGE
  $ fluence build [--no-input]

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Build all application services, described in fluence.yaml

EXAMPLES
  $ fluence build
```

_See code: [dist/commands/build.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.2.35/dist/commands/build.ts)_

## `fluence dep cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

```
USAGE
  $ fluence dep cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--toolchain <value>] [--force]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: marine@0.12.4

FLAGS
  --force                       Force install even if the dependency/dependencies is/are already installed
  --no-input                    Don't interactively ask for any input from the user
  --toolchain=<toolchain_name>  Rustup toolchain name (such as stable or nightly-2022-09-15-x86_64)

DESCRIPTION
  Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

ALIASES
  $ fluence dependency cargo i
  $ fluence dep cargo i

EXAMPLES
  $ fluence dep cargo i
```

## `fluence dep i`

Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

```
USAGE
  $ fluence dep i [--no-input] [--recommended | --latest] [--force]

FLAGS
  --force        Force install even if the dependency/dependencies is/are already installed
  --latest       Set recommended versions of @fluencelabs/aqua, marine and mrepl dependencies and install all
                 dependencies from fluence.yaml
  --no-input     Don't interactively ask for any input from the user
  --recommended  Set latest versions of @fluencelabs/aqua, marine and mrepl dependencies and install all dependencies
                 from fluence.yaml

DESCRIPTION
  Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

ALIASES
  $ fluence dependency i
  $ fluence dep i

EXAMPLES
  $ fluence dep i
```

## `fluence dep npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

```
USAGE
  $ fluence dep npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--force]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: @fluencelabs/aqua-lib@0.6.0

FLAGS
  --force     Force install even if the dependency/dependencies is/are already installed
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

ALIASES
  $ fluence dependency npm i
  $ fluence dep npm i

EXAMPLES
  $ fluence dep npm i
```

## `fluence dependency cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

```
USAGE
  $ fluence dependency cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--toolchain <value>] [--force]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: marine@0.12.4

FLAGS
  --force                       Force install even if the dependency/dependencies is/are already installed
  --no-input                    Don't interactively ask for any input from the user
  --toolchain=<toolchain_name>  Rustup toolchain name (such as stable or nightly-2022-09-15-x86_64)

DESCRIPTION
  Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

ALIASES
  $ fluence dependency cargo i
  $ fluence dep cargo i

EXAMPLES
  $ fluence dependency cargo i
```

## `fluence dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

```
USAGE
  $ fluence dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--toolchain <value>] [--force]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: marine@0.12.4

FLAGS
  --force                       Force install even if the dependency/dependencies is/are already installed
  --no-input                    Don't interactively ask for any input from the user
  --toolchain=<toolchain_name>  Rustup toolchain name (such as stable or nightly-2022-09-15-x86_64)

DESCRIPTION
  Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

ALIASES
  $ fluence dependency cargo i
  $ fluence dep cargo i

EXAMPLES
  $ fluence dependency cargo install
```

## `fluence dependency i`

Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

```
USAGE
  $ fluence dependency i [--no-input] [--recommended | --latest] [--force]

FLAGS
  --force        Force install even if the dependency/dependencies is/are already installed
  --latest       Set recommended versions of @fluencelabs/aqua, marine and mrepl dependencies and install all
                 dependencies from fluence.yaml
  --no-input     Don't interactively ask for any input from the user
  --recommended  Set latest versions of @fluencelabs/aqua, marine and mrepl dependencies and install all dependencies
                 from fluence.yaml

DESCRIPTION
  Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

ALIASES
  $ fluence dependency i
  $ fluence dep i

EXAMPLES
  $ fluence dependency i
```

## `fluence dependency install`

Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

```
USAGE
  $ fluence dependency install [--no-input] [--recommended | --latest] [--force]

FLAGS
  --force        Force install even if the dependency/dependencies is/are already installed
  --latest       Set recommended versions of @fluencelabs/aqua, marine and mrepl dependencies and install all
                 dependencies from fluence.yaml
  --no-input     Don't interactively ask for any input from the user
  --recommended  Set latest versions of @fluencelabs/aqua, marine and mrepl dependencies and install all dependencies
                 from fluence.yaml

DESCRIPTION
  Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

ALIASES
  $ fluence dependency i
  $ fluence dep i

EXAMPLES
  $ fluence dependency install
```

## `fluence dependency npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

```
USAGE
  $ fluence dependency npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--force]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: @fluencelabs/aqua-lib@0.6.0

FLAGS
  --force     Force install even if the dependency/dependencies is/are already installed
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

ALIASES
  $ fluence dependency npm i
  $ fluence dep npm i

EXAMPLES
  $ fluence dependency npm i
```

## `fluence dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

```
USAGE
  $ fluence dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--force]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: @fluencelabs/aqua-lib@0.6.0

FLAGS
  --force     Force install even if the dependency/dependencies is/are already installed
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

ALIASES
  $ fluence dependency npm i
  $ fluence dep npm i

EXAMPLES
  $ fluence dependency npm install
```

## `fluence deploy`

Deploy application, described in fluence.yaml

```
USAGE
  $ fluence deploy [--no-input] [--relay <value>] [--force] [--timeout <value>] [-k <value>]

FLAGS
  -k, --key-pair-name=<name>  Key pair name
  --force                     Force removing of previously deployed app
  --no-input                  Don't interactively ask for any input from the user
  --relay=<multiaddr>         Relay node multiaddr
  --timeout=<milliseconds>    Timeout used for command execution

DESCRIPTION
  Deploy application, described in fluence.yaml

EXAMPLES
  $ fluence deploy
```

_See code: [dist/commands/deploy.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.2.35/dist/commands/deploy.ts)_

## `fluence help [COMMAND]`

Display help for fluence.

```
USAGE
  $ fluence help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for fluence.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.19/src/commands/help.ts)_

## `fluence init [PATH]`

Initialize fluence project

```
USAGE
  $ fluence init [PATH] [--no-input] [-t <value>]

ARGUMENTS
  PATH  Project path

FLAGS
  -t, --template=<value>  Template to use for the project. One of: minimal, ts, js
  --no-input              Don't interactively ask for any input from the user

DESCRIPTION
  Initialize fluence project

EXAMPLES
  $ fluence init
```

_See code: [dist/commands/init.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.2.35/dist/commands/init.ts)_

## `fluence key default [NAME]`

Set default key-pair for user or project

```
USAGE
  $ fluence key default [NAME] [--no-input] [--user]

ARGUMENTS
  NAME  Key-pair name

FLAGS
  --no-input  Don't interactively ask for any input from the user
  --user      Set default key-pair for current user instead of current project

DESCRIPTION
  Set default key-pair for user or project

EXAMPLES
  $ fluence key default
```

## `fluence key new [NAME]`

Generate key-pair and store it in user-secrets.yaml or project-secrets.yaml

```
USAGE
  $ fluence key new [NAME] [--no-input] [--user]

ARGUMENTS
  NAME  Key-pair name

FLAGS
  --no-input  Don't interactively ask for any input from the user
  --user      Generate key-pair for current user instead of generating key-pair for current project

DESCRIPTION
  Generate key-pair and store it in user-secrets.yaml or project-secrets.yaml

EXAMPLES
  $ fluence key new
```

## `fluence key remove [NAME]`

Remove key-pair from user-secrets.yaml or project-secrets.yaml

```
USAGE
  $ fluence key remove [NAME] [--no-input] [--user]

ARGUMENTS
  NAME  Key-pair name

FLAGS
  --no-input  Don't interactively ask for any input from the user
  --user      Remove key-pair from current user instead of removing key-pair from current project

DESCRIPTION
  Remove key-pair from user-secrets.yaml or project-secrets.yaml

EXAMPLES
  $ fluence key remove
```

## `fluence module add [PATH | URL]`

Add module to service.yaml

```
USAGE
  $ fluence module add [PATH | URL] [--no-input] [--name <value>] [--service <value>]

ARGUMENTS
  PATH | URL  Path to a module or url to .tar.gz archive

FLAGS
  --name=<name>            Override module name
  --no-input               Don't interactively ask for any input from the user
  --service=<name | path>  Service name from fluence.yaml or path to the service directory

DESCRIPTION
  Add module to service.yaml

EXAMPLES
  $ fluence module add
```

## `fluence module new [PATH]`

Create new marine module template

```
USAGE
  $ fluence module new [PATH] [--no-input]

ARGUMENTS
  PATH  Module path

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Create new marine module template

EXAMPLES
  $ fluence module new
```

## `fluence module remove [NAME | PATH | URL]`

Remove module from service.yaml

```
USAGE
  $ fluence module remove [NAME | PATH | URL] [--no-input] [--service <value>]

ARGUMENTS
  NAME | PATH | URL  Module name from service.yaml, path to a module or url to .tar.gz archive

FLAGS
  --no-input               Don't interactively ask for any input from the user
  --service=<name | path>  Service name from fluence.yaml or path to the service directory

DESCRIPTION
  Remove module from service.yaml

EXAMPLES
  $ fluence module remove
```

## `fluence remove`

Remove previously deployed config

```
USAGE
  $ fluence remove [--no-input] [--relay <value>] [--timeout <value>]

FLAGS
  --no-input                Don't interactively ask for any input from the user
  --relay=<multiaddr>       Relay node multiaddr
  --timeout=<milliseconds>  Timeout used for command execution

DESCRIPTION
  Remove previously deployed config

EXAMPLES
  $ fluence remove
```

_See code: [dist/commands/remove.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.2.35/dist/commands/remove.ts)_

## `fluence run`

Run aqua script

```
USAGE
  $ fluence run [--no-input] [--relay <value>] [--data <value>] [--data-path <value>] [--import <value>]
    [--log-level-compiler <value>] [--log-level-avm <value>] [--print-particle-id] [--quiet] [--plugin <value>] [--const
    <value>] [--json-service <value>] [-i <value>] [-f <value>] [--no-xor] [--no-relay] [--print-air] [--timeout
    <value>] [-k <value>]

FLAGS
  -f, --func=<function-call>    Function call
  -i, --input=<path>            Path to an aqua file or to a directory that contains aqua files
  -k, --key-pair-name=<name>    Key pair name
  --const=<NAME = value>...     Constant that will be used in the aqua code that you run (example of aqua code:
                                SOME_CONST ?= "default_value"). Constant name must be upper cased.
  --data=<json>                 JSON in { [argumentName]: argumentValue } format. You can call a function using these
                                argument names
  --data-path=<path>            Path to a JSON file in { [argumentName]: argumentValue } format. You can call a function
                                using these argument names
  --import=<path>...            Path to a directory to import from. May be used several times
  --json-service=<path>...      Path to a file that contains a JSON formatted service
  --log-level-avm=<level>       Set log level for AquaVM. Must be one of: debug, info, warn, error, off, trace
  --log-level-compiler=<level>  Set log level for the compiler. Must be one of: Must be one of: all, trace, debug, info,
                                warn, error, off
  --no-input                    Don't interactively ask for any input from the user
  --no-relay                    Do not generate a pass through the relay node
  --no-xor                      Do not generate a wrapper that catches and displays errors
  --plugin=<path>               [experimental] Path to a directory with JS plugins (Read more:
                                https://fluence.dev/docs/aqua-book/aqua-cli/plugins)
  --print-air                   Prints generated AIR code before function execution
  --print-particle-id           If set, newly initiated particle ids will be printed to console. Useful to see what
                                particle id is responsible for aqua function
  --quiet                       Print only execution result. Overrides all --log-level-* flags
  --relay=<multiaddr>           Relay node multiaddr
  --timeout=<milliseconds>      Timeout used for command execution

DESCRIPTION
  Run aqua script

EXAMPLES
  $ fluence run
```

_See code: [dist/commands/run.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.2.35/dist/commands/run.ts)_

## `fluence service add [PATH | URL]`

Add service to fluence.yaml

```
USAGE
  $ fluence service add [PATH | URL] [--no-input] [--name <value>]

ARGUMENTS
  PATH | URL  Path to a service or url to .tar.gz archive

FLAGS
  --name=<name>  Override service name (must start with a lowercase letter and contain only letters, numbers, and
                 underscores)
  --no-input     Don't interactively ask for any input from the user

DESCRIPTION
  Add service to fluence.yaml

EXAMPLES
  $ fluence service add
```

## `fluence service new [PATH]`

Create new marine service template

```
USAGE
  $ fluence service new [PATH] [--no-input] [--name <value>]

ARGUMENTS
  PATH  Path to a service

FLAGS
  --name=<name>  Unique service name (must start with a lowercase letter and contain only letters, numbers, and
                 underscores)
  --no-input     Don't interactively ask for any input from the user

DESCRIPTION
  Create new marine service template

EXAMPLES
  $ fluence service new
```

## `fluence service remove [NAME | PATH | URL]`

Remove service from fluence.yaml

```
USAGE
  $ fluence service remove [NAME | PATH | URL] [--no-input]

ARGUMENTS
  NAME | PATH | URL  Service name from fluence.yaml, path to a service or url to .tar.gz archive

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Remove service from fluence.yaml

EXAMPLES
  $ fluence service remove
```

## `fluence service repl [NAME | PATH | URL]`

Open service inside repl (downloads and builds modules if necessary)

```
USAGE
  $ fluence service repl [NAME | PATH | URL] [--no-input]

ARGUMENTS
  NAME | PATH | URL  Service name from fluence.yaml, path to a service or url to .tar.gz archive

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Open service inside repl (downloads and builds modules if necessary)

EXAMPLES
  $ fluence service repl
```
<!-- commandsstop -->
