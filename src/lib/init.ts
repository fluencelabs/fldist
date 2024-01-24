/**
 * Copyright 2023 Fluence Labs Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { cwd } from "node:process";

import { color } from "@oclif/color";

import {
  initNewFluenceConfig,
  type FluenceConfig,
} from "../lib/configs/project/fluence.js";
import {
  type Template,
  FS_OPTIONS,
  RECOMMENDED_GITIGNORE_CONTENT,
  TEMPLATES,
  isTemplate,
  CLI_NAME_FULL,
  getMainAquaFileContent,
  READMEs,
  JS_CLIENT_NPM_DEPENDENCY,
  README_MD_FILE_NAME,
  TYPESCRIPT_NPM_DEPENDENCY,
} from "../lib/const.js";
import {
  ensureFrontendCompiledAquaPath,
  ensureFluenceAquaServicesPath,
  ensureServicesDir,
  ensureVSCodeExtensionsJsonPath,
  getGitignorePath,
  setProjectRootDir,
  getREADMEPath,
  projectRootDir,
  getFrontendPackageJSONPath,
  getFrontendSrcPath,
  getFrontendCompiledAquaPath,
  getIndexHTMLPath,
  getFrontendTsConfigPath,
  getFrontendPath,
  ensureGatewayCompiledAquaPath,
  getGatewayServerTSorJSPath,
  getGatewayPackageJSONPath,
  getGatewaySrcPath,
  getGatewayTsConfigPath,
  getGatewayPath,
} from "../lib/paths.js";
import { confirm, input, list } from "../lib/prompt.js";
import CLIPackageJSON from "../versions/cli.package.json" assert { type: "json" };

import { addService } from "./addService.js";
import { compileToFiles } from "./aqua.js";
import { commandObj, isInteractive } from "./commandObj.js";
import { envConfig, setEnvConfig } from "./configs/globalConfigs.js";
import { initNewEnvConfig } from "./configs/project/env.js";
import { initNewReadonlyProviderConfig } from "./configs/project/provider.js";
import { initNewReadonlyServiceConfig } from "./configs/project/service.js";
import { initNewWorkersConfigReadonly } from "./configs/project/workers.js";
import { SERVICE_INTERFACE_FILE_HEADER } from "./const.js";
import { addCountlyEvent } from "./countly.js";
import { generateNewModule } from "./generateNewModule.js";
import type { ProviderConfigArgs } from "./generateUserProviderConfig.js";
import { getAquaImports } from "./helpers/aquaImports.js";
import { jsonStringify } from "./helpers/utils.js";
import { initMarineCli } from "./marineCli.js";
import { updateRelaysJSON, resolveFluenceEnv } from "./multiaddres.js";
import { copyDefaultDependencies } from "./npm.js";
import { getFrontendIndexTSorJSPath, ensureAquaMainPath } from "./paths.js";

const selectTemplate = (): Promise<Template> => {
  return list({
    message: "Select template",
    options: [...TEMPLATES],
    oneChoiceMessage: (): never => {
      throw new Error("Unreachable: only one template");
    },
    onNoChoices: (): never => {
      throw new Error("Unreachable: no templates");
    },
  });
};

type EnsureTemplateArg = {
  templateOrUnknown: string | undefined;
};

export const ensureTemplate = ({
  templateOrUnknown,
}: EnsureTemplateArg): Promise<Template> => {
  if (isTemplate(templateOrUnknown)) {
    return Promise.resolve(templateOrUnknown);
  }

  if (typeof templateOrUnknown === "string") {
    commandObj.warn(
      `Unknown template: ${color.yellow(
        templateOrUnknown,
      )}. Available templates: ${TEMPLATES.join(", ")}`,
    );
  }

  return selectTemplate();
};

type InitArg = {
  maybeProjectPath?: string | undefined;
  template?: Template | undefined;
  env?: string | undefined;
} & Omit<ProviderConfigArgs, "env" | "name">;

export async function init(options: InitArg = {}): Promise<FluenceConfig> {
  const projectPath =
    options.maybeProjectPath === undefined && !isInteractive
      ? process.cwd()
      : resolve(
          options.maybeProjectPath ??
            (await input({
              message:
                "Enter project path or press enter to init in the current directory",
              default: cwd(),
            })),
        );

  if (!(await shouldInit(projectPath))) {
    commandObj.error(
      `Directory ${color.yellow(
        projectPath,
      )} is not empty. Please, init in an empty directory.`,
    );
  }

  const { template = await selectTemplate() } = options;
  await addCountlyEvent(`init:template:${template}`);
  await mkdir(projectPath, { recursive: true });
  setProjectRootDir(projectPath);

  await writeFile(
    await ensureFluenceAquaServicesPath(),
    `${SERVICE_INTERFACE_FILE_HEADER}\n`,
    FS_OPTIONS,
  );

  const fluenceConfig = await initNewFluenceConfig();
  await copyDefaultDependencies();
  const fluenceEnv = await resolveFluenceEnv(options.env);

  if (envConfig === null) {
    setEnvConfig(await initNewEnvConfig(fluenceEnv));
  } else {
    envConfig.fluenceEnv = fluenceEnv;
    await envConfig.$commit();
  }

  if (fluenceEnv === "local") {
    await initNewReadonlyProviderConfig({
      env: "local",
      noxes: options.noxes,
    });
  }

  await writeFile(
    await ensureAquaMainPath(),
    getMainAquaFileContent(template === "minimal"),
    FS_OPTIONS,
  );

  await writeFile(
    await ensureVSCodeExtensionsJsonPath(),
    jsonStringify({
      recommendations: ["redhat.vscode-yaml", "FluenceLabs.aqua"],
    }) + "\n",
    FS_OPTIONS,
  );

  await writeFile(
    getGitignorePath(),
    RECOMMENDED_GITIGNORE_CONTENT,
    FS_OPTIONS,
  );

  const workersConfig = await initNewWorkersConfigReadonly();
  const { ensureAquaFileWithWorkerInfo } = await import("./deployWorkers.js");
  await ensureAquaFileWithWorkerInfo(workersConfig, fluenceConfig, fluenceEnv);
  await writeFile(getREADMEPath(), READMEs[template], FS_OPTIONS);

  switch (template) {
    case "minimal":
      break;

    case "quickstart": {
      await quickstart();
      await initTSorJSGatewayProject({ isJS: true, fluenceConfig });
      break;
    }

    case "js": {
      await quickstart();
      await initTSorJSProject({ isJS: true, fluenceConfig });
      await initTSorJSGatewayProject({ isJS: true, fluenceConfig });
      break;
    }

    case "ts": {
      await quickstart();
      await initTSorJSProject({ isJS: false, fluenceConfig });
      await initTSorJSGatewayProject({ isJS: false, fluenceConfig });
      break;
    }
  }

  async function quickstart() {
    const serviceName = "myService";
    const absoluteServicePath = join(await ensureServicesDir(), serviceName);
    const pathToModuleDir = join(absoluteServicePath, "modules", serviceName);
    await generateNewModule(pathToModuleDir);

    await initNewReadonlyServiceConfig(
      absoluteServicePath,
      relative(absoluteServicePath, pathToModuleDir),
      serviceName,
    );

    await addService({
      serviceName,
      fluenceConfig,
      marineCli: await initMarineCli(),
      absolutePathOrUrl: absoluteServicePath,
      interactive: false,
    });
  }

  await updateRelaysJSON({
    fluenceConfig,
    noxes: options.noxes,
  });

  commandObj.logToStderr(
    color.magentaBright(
      `\nSuccessfully initialized ${CLI_NAME_FULL} project template at ${projectPath}\n`,
    ),
  );

  return fluenceConfig;
}

const shouldInit = async (projectPath: string): Promise<boolean> => {
  let directoryContent: string[];

  return (
    !isInteractive ||
    !existsSync(projectPath) ||
    !(await stat(projectPath)).isDirectory() ||
    (directoryContent = await readdir(projectPath)).length === 0 ||
    (directoryContent.length === 1 && directoryContent[0] === ".git") ||
    (await confirm({
      message: `Directory ${color.yellow(projectPath)} is not empty. Proceed?`,
    }))
  );
};

type InitTSorJSProjectArg = {
  isJS: boolean;
  fluenceConfig: FluenceConfig;
};

async function initTSorJSProject({
  isJS,
  fluenceConfig,
}: InitTSorJSProjectArg): Promise<void> {
  const frontendCompiledAquaPath = await ensureFrontendCompiledAquaPath();
  const indexFilePath = getFrontendIndexTSorJSPath(isJS);
  const packageJSONPath = getFrontendPackageJSONPath();
  const frontendSrcPath = getFrontendSrcPath();

  addRelayPathEntryToConfig(
    fluenceConfig,
    relative(projectRootDir, frontendSrcPath),
  );

  const relativeFrontendCompiledAquaPath = relative(
    projectRootDir,
    frontendCompiledAquaPath,
  );

  fluenceConfig[isJS ? "aquaOutputJSPath" : "aquaOutputTSPath"] =
    relativeFrontendCompiledAquaPath;

  await Promise.all([
    fluenceConfig.$commit(),
    writeFile(indexFilePath, getFrontendIndexJsContent(isJS), FS_OPTIONS),
    writeFile(
      packageJSONPath,
      jsonStringify(getFrontendPackageJSON(isJS)),
      FS_OPTIONS,
    ),
    writeFile(getIndexHTMLPath(), getIndexHTMLContent(isJS), FS_OPTIONS),
    isJS
      ? Promise.resolve()
      : writeFile(
          getFrontendTsConfigPath(),
          FRONTEND_TS_CONFIG_CONTENT,
          FS_OPTIONS,
        ),

    compileToFiles({
      compileArgs: {
        filePath: await ensureAquaMainPath(),
        imports: await getAquaImports({
          maybeFluenceConfig: fluenceConfig,
        }),
      },
      targetType: isJS ? "js" : "ts",
      outputPath: frontendCompiledAquaPath,
    }),
  ]);
}

type InitTSorJSGatewayProjectArg = {
  isJS: boolean;
  fluenceConfig: FluenceConfig;
};

async function initTSorJSGatewayProject({
  isJS,
  fluenceConfig,
}: InitTSorJSGatewayProjectArg): Promise<void> {
  const gatewayCompiledAquaPath = await ensureGatewayCompiledAquaPath();
  const indexFilePath = getGatewayServerTSorJSPath(isJS);
  const packageJSONPath = getGatewayPackageJSONPath();
  const gatewaySrcPath = getGatewaySrcPath();
  const gatewayReadmePath = join(getGatewayPath(), README_MD_FILE_NAME);

  addRelayPathEntryToConfig(
    fluenceConfig,
    relative(projectRootDir, gatewaySrcPath),
  );

  await Promise.all([
    fluenceConfig.$commit(),
    writeFile(indexFilePath, getGatewayIndexJsContent(isJS), FS_OPTIONS),
    writeFile(
      packageJSONPath,
      jsonStringify(getGatewayPackageJSON(isJS)),
      FS_OPTIONS,
    ),
    writeFile(gatewayReadmePath, GATEWAY_README_CONTENT, FS_OPTIONS),
    isJS
      ? Promise.resolve()
      : writeFile(
          getGatewayTsConfigPath(),
          GATEWAY_TS_CONFIG_CONTENT,
          FS_OPTIONS,
        ),

    compileToFiles({
      compileArgs: {
        filePath: await ensureAquaMainPath(),
        imports: await getAquaImports({
          maybeFluenceConfig: fluenceConfig,
        }),
      },
      targetType: isJS ? "js" : "ts",
      outputPath: gatewayCompiledAquaPath,
    }),
  ]);
}

function getIndexHTMLContent(isJS: boolean) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link
      rel="icon"
      href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgc3R5bGU9ImZpbGw6bm9uZSI+PHBhdGggZD0iTTE3LjI3NyAwaC0yLjQzNHY1LjM1NGMtNS4zNy41NzctOS41NSA1LjEyMy05LjU1IDEwLjY0NiAwIDUuNTIzIDQuMTggMTAuMDcgOS41NSAxMC42NDZWMzJoMi40MzR2LTUuMzY4YzUuMzEtLjYzMiA5LjQzLTUuMTUgOS40My0xMC42MzIgMC01LjQ4MS00LjEyLTEwLTkuNDMtMTAuNjMyek03LjcyNiAxNmE4LjI3NiA4LjI3NiAwIDAgMSA3LjExOS04LjE5NHYxNi4zODhBOC4yNzYgOC4yNzYgMCAwIDEgNy43MjYgMTZabTE2LjU0OCAwYTguMjc2IDguMjc2IDAgMCAxLTYuOTk2IDguMTc2VjcuODI0QTguMjc2IDguMjc2IDAgMCAxIDI0LjI3MyAxNloiIHN0eWxlPSJjbGlwLXJ1bGU6ZXZlbm9kZDtmaWxsOiNlNDFjNWM7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQiLz48L3N2Zz4="
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fluence</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/${relative(
      getFrontendPath(),
      getFrontendIndexTSorJSPath(isJS),
    )}"></script>
  </body>
</html>
`;
}

function getFrontendIndexJsContent(isJS: boolean) {
  return `import { Fluence } from "@fluencelabs/js-client";
import relays from "./relays.json" assert { type: "json" };
import {
  helloWorld,
  helloWorldRemote,
  runDeployedServices,
  showSubnet,
} from "./${relative(
    getFrontendSrcPath(),
    join(getFrontendCompiledAquaPath(), "main.js"),
  )}";

const appEl =
  document.querySelector("#app") ??
  (() => {
    throw new Error("#app element is not found");
  })();

const aquaFunctions = [
  {
    name: "helloWorld",
    fn() {
      return helloWorld("Fluence");
    },
  },
  {
    name: "helloWorldRemote",
    fn() {
      return helloWorldRemote("Fluence");
    },
  },
  {
    name: "showSubnet",
    fn() {
      return showSubnet();
    },
  },
  {
    name: "runDeployedServices",
    fn() {
      return runDeployedServices();
    },
  },
];

(async () => {
  const p = document.createElement("p");
  p.innerText = "Loading...";
  appEl.append(p);
  try {
    await Fluence.connect(relays[0].multiaddr);
  } catch (error) {
    p.style.color = "red";
    p.innerText = \`❌ \${stringifyError(error)}\`;
    throw error;
  }

  p.remove();

  aquaFunctions.forEach((aquaFn) => {
    const buttonEl = document.createElement("button");
    buttonEl.innerText = aquaFn.name;

    buttonEl.addEventListener("click", () => {
      runAquaFunction(aquaFn);
    });

    appEl.append(buttonEl);
  });
})();

${
  isJS
    ? ""
    : `type AquaFunction = {
  name: string;
  fn: () => Promise<unknown>;
};
`
}
async function runAquaFunction({ fn, name }${isJS ? "" : ": AquaFunction"}) {
  const p = document.createElement("p");
  p.style.whiteSpace = "pre-wrap";
  try {
    const res = await fn();
    p.style.color = "green";
    p.innerHTML = \`\${name}: ✅ \${JSON.stringify(res, null, 2)}\`;
  } catch (e) {
    p.style.color = "red";
    p.innerHTML = \`\${name}: ❌ \${stringifyError(e)}\`;
  }
  appEl.append(p);
}

function stringifyError(e${isJS ? "" : ": unknown"}) {
  if (e instanceof Error) {
    return e.message;
  }

  if (e instanceof Object) {
    const message = JSON.stringify(e, null, 2);
    if (message.includes("[0].dealIdOriginal")) {
      return "Please, make sure you have deployed the service";
    }

    return JSON.stringify(e, null, 2);
  }

  return String(e);
}
`;
}

function getGatewayIndexJsContent(isJS: boolean) {
  return `${
    isJS
      ? ""
      : 'import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";\n'
  }import { Fluence } from "@fluencelabs/js-client";
import relays from "./relays.json" assert { type: "json" };
import { ${isJS ? "" : "type Static, "}Type } from "@sinclair/typebox";
import fastify from "fastify";

import { helloWorld, helloWorldRemote, showSubnet, runDeployedServices } from "./compiled-aqua/main.js";

// This is an authorization token for the gateway service.
// Remember to generate the appropriate token and save it in env variables.
const ACCESS_TOKEN = "abcdefhi";

// This is the peer's private key.
// It must be regenerated and properly hidden otherwise one could steal it and pretend to be this gateway.
const PEER_PRIVATE_KEY = new TextEncoder().encode(
  new Array(32).fill("a").join(""),
);

const server = fastify({
  logger: true,
})${isJS ? "" : ".withTypeProvider<TypeBoxTypeProvider>()"};

await server.register(import("@fastify/rate-limit"), {
  max: 100,
  timeWindow: "1 minute",
});

server.addHook("onReady", async () => {
  await Fluence.connect(relays[0], {
    keyPair: {
      type: "Ed25519",
      source: PEER_PRIVATE_KEY,
    },
  });
});

server.addHook("onRequest", async (request, reply) => {
  if (request.headers.access_token !== ACCESS_TOKEN) {
    await reply.status(403).send({
      error: "Unauthorized",
      statusCode: 403,
    });
  }
});

server.addHook("onClose", async () => {
  await Fluence.disconnect();
});

const callbackBody = Type.Object({
  name: Type.String(),
});

${isJS ? "" : "type callbackBodyType = Static<typeof callbackBody>;"}

const callbackResponse = Type.String();

${isJS ? "" : "type callbackResponseType = Static<typeof callbackResponse>;"}

const showSubnetResponse = Type.Array(
  Type.Object({
    host_id: Type.Union([Type.String(), Type.Null()]),
    services: Type.Union([Type.Array(Type.String()), Type.Null()]),
    spells: Type.Union([Type.Array(Type.String()), Type.Null()]),
    worker_id: Type.Union([Type.String(), Type.Null()]),
  }),
);

${
  isJS ? "" : "type showSubnetResponseType = Static<typeof showSubnetResponse>;"
}

const runDeployedServicesResponse = Type.Array(
  Type.Object({
    answer: Type.Union([Type.String(), Type.Null()]),
    worker: Type.Object({
      host_id: Type.String(),
      pat_id: Type.String(),
      worker_id: Type.Union([Type.String(), Type.Null()]),
    }),
  }),
);

${
  isJS
    ? ""
    : "type runDeployedServicesResponseType = Static<typeof runDeployedServicesResponse>;"
}

// Request and response
server.post${
    isJS ? "" : "<{ Body: callbackBodyType; Reply: callbackResponseType }>"
  }(
  "/my/callback/hello",
  { schema: { body: callbackBody, response: { 200: callbackResponse } } },
  async (request, reply) => {
    const { name } = request.body;
    const result = await helloWorld(name);
    return reply.send(result);
  },
);

// Fire and forget
server.post("/my/webhook/hello", async (_request, reply) => {
  void helloWorldRemote("Fluence");
  return reply.send();
});

server.post${isJS ? "" : "<{ Reply: showSubnetResponseType }>"}(
  "/my/callback/showSubnet",
  { schema: { response: { 200: showSubnetResponse } } },
  async (_request, reply) => {
    const result = await showSubnet();
    return reply.send(result);
  },
);

server.post${isJS ? "" : "<{ Reply: runDeployedServicesResponseType }>"}(
  "/my/callback/runDeployedServices",
  { schema: { response: { 200: runDeployedServicesResponse } } },
  async (_request, reply) => {
    const result = await runDeployedServices();
    return reply.send(result);
  },
);

server.listen({ port: 8080, host: "0.0.0.0" }, (err, address) => {
  if (err !== null) {
    console.error(err);
    process.exit(1);
  }

  console.log(\`Server listening at \${address}\`);
});`;
}

const FRONTEND_TS_CONFIG_CONTENT = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`;

const GATEWAY_TS_CONFIG_CONTENT = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
`;

function getFrontendPackageJSON(isJS: boolean) {
  return {
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: `${isJS ? "" : "tsc && "}vite build`,
      preview: "vite preview",
    },
    dependencies: {
      [JS_CLIENT_NPM_DEPENDENCY]:
        CLIPackageJSON.dependencies[JS_CLIENT_NPM_DEPENDENCY],
    },
    devDependencies: {
      vite: "4.4.5",
      ...(isJS
        ? {}
        : {
            [TYPESCRIPT_NPM_DEPENDENCY]:
              CLIPackageJSON.devDependencies[TYPESCRIPT_NPM_DEPENDENCY],
          }),
    },
  };
}

function getGatewayPackageJSON(isJS: boolean) {
  return {
    private: true,
    name: "gateway",
    description: "Fluence gateway for running aqua function via HTTP methods",
    version: "0.0.1",
    type: "module",
    keywords: [],
    scripts: {
      ...(isJS
        ? {}
        : {
            build: "rm -rf ./dist && tsc -p tsconfig.json",
          }),
      start: isJS
        ? "node --no-warnings src/server.js"
        : "node --no-warnings --loader ts-node/esm src/server.ts",
    },
    dependencies: {
      [JS_CLIENT_NPM_DEPENDENCY]:
        CLIPackageJSON.dependencies[JS_CLIENT_NPM_DEPENDENCY],
      fastify: "4.25.2",
      "@fastify/rate-limit": "9.1.0",
      "@sinclair/typebox": "0.32.11",
    },
    ...(isJS
      ? {}
      : {
          devDependencies: {
            "@types/node": "20.11.5",
            "@fastify/type-provider-typebox": "4.0.0",
            [TYPESCRIPT_NPM_DEPENDENCY]:
              CLIPackageJSON.devDependencies[TYPESCRIPT_NPM_DEPENDENCY],
            "ts-node": "10.9.2",
          },
        }),
  };
}

const GATEWAY_README_CONTENT = `## Fluence HTTP Gateway

Here you can find an example of simple Fluence HTTP gateway.
The gateway allows you to map Aqua functions to http requests i.e., you can create HTTP route and handle the incoming request by executing some Aqua function.
You can check it out and test this repo.

### Start gateway

- \`npm install\`
- \`npm run start\`
- \`curl -X POST http://localhost:8080/my/callback/hello -H "ACCESS_TOKEN: abcdefhi" -H 'Content-Type: application/json' -d '{"name": "Fluence" }'\`
- After running these commands you should see: \`Hello, Fluence\`

### Notes:

Gateway contains four routes corresponding to Aqua functions: \`helloWorld\`, \`helloWorldRemote\`, \`showSubnet\` and \`runDeployedServices\`.

You can run \`helloWorld\` and \`helloWorldRemote\` right away.
To run \`showSubnet\` and \`runDeployedServices\` successfully, it is required to do \`fluence deal deploy\` then compile Aqua and restart the server.

Currently, \`fluence aqua\` won't put generated files to gateway dir automatically. Remember to pass \`-o/--output\` flag to CLI for that or change the config in \`fluence.yaml\`.

> Remember to replace hardcoded token and peer private key. You can achieve that by placing these credentials in env variables, for example.
`;

function addRelayPathEntryToConfig(fluenceConfig: FluenceConfig, path: string) {
  if (fluenceConfig.relaysPath === undefined) {
    fluenceConfig.relaysPath = [path];
  } else if (typeof fluenceConfig.relaysPath === "string") {
    fluenceConfig.relaysPath = [fluenceConfig.relaysPath, path];
  } else {
    fluenceConfig.relaysPath = [...fluenceConfig.relaysPath, path];
  }
}
