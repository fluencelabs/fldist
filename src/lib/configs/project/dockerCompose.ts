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

import assert from "assert";
import { join, relative } from "path";

import type { JSONSchemaType } from "ajv";
import { yamlDiffPatch } from "yaml-diff-patch";

import { versions } from "../../../versions.js";
import {
  DOCKER_COMPOSE_FILE_NAME,
  DOCKER_COMPOSE_FULL_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  IPFS_PORT,
  IPFS_CONTAINER_NAME,
  CHAIN_CONTAINER_NAME,
  CHAIN_PORT,
  TCP_PORT_START,
  WEB_SOCKET_PORT_START,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  CONFIGS_DIR_NAME,
} from "../../const.js";
import type { ProviderConfigArgs } from "../../generateUserProviderConfig.js";
import { getSecretKeyOrReturnExisting } from "../../keyPairs.js";
import { ensureFluenceConfigsDir, getFluenceDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type GetDefaultConfig,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
} from "../initConfig.js";

import {
  initNewReadonlyProviderConfig,
  ensureConfigToml,
  type ProviderConfigReadonly,
} from "./provider.js";
import { getConfigTomlName } from "./provider.js";

type Service = {
  image?: string;
  ports?: string[];
  pull_policy?: string;
  environment?: Record<string, string | number>;
  volumes?: string[];
  command?: string[];
  depends_on?: string[];
  secrets?: string[];
};

const serviceSchema: JSONSchemaType<Service> = {
  type: "object",
  properties: {
    image: { type: "string", nullable: true },
    ports: {
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
    pull_policy: { type: "string", nullable: true },
    environment: {
      type: "object",
      additionalProperties: { type: ["string", "number"] },
      required: [],
      nullable: true,
    },
    volumes: {
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
    command: {
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
    depends_on: {
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
    secrets: {
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
  },
  required: [],
};

type ConfigV0 = {
  version: "3";
  services: Record<string, Service>;
  include?: string[];
  secrets?: Record<string, { file?: string }>;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${DOCKER_COMPOSE_FULL_FILE_NAME}`,
  title: DOCKER_COMPOSE_FULL_FILE_NAME,
  type: "object",
  description: "Defines a multi-containers based application.",
  properties: {
    version: { type: "string", const: "3" },
    services: {
      type: "object",
      additionalProperties: serviceSchema,
      properties: {
        service: serviceSchema,
      },
      required: [],
    },
    include: {
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
    secrets: {
      type: "object",
      nullable: true,
      additionalProperties: {
        type: "object",
        properties: {
          file: { type: "string", nullable: true },
        },
        required: [],
      },
      required: [],
    },
  },
  required: ["version", "services"],
};

type GenNoxImageArgs = {
  name: string;
  tcpPort: number;
  webSocketPort: number;
  bootstrapName: string;
  bootstrapTcpPort?: number;
};

function genNox({
  name,
  tcpPort,
  webSocketPort,
  bootstrapName,
  bootstrapTcpPort,
}: GenNoxImageArgs): [name: string, service: Service] {
  const configTomlName = getConfigTomlName(name);
  const configLocation = `/run/${CONFIGS_DIR_NAME}/${configTomlName}`;
  return [
    name,
    {
      image: versions.nox,
      pull_policy: "always",
      ports: [`${tcpPort}:${tcpPort}`, `${webSocketPort}:${webSocketPort}`],
      environment: {
        WASM_LOG: "info",
        RUST_LOG:
          "debug,particle_reap=debug,aquamarine=warn,aquamarine::particle_functions=debug,aquamarine::log=debug,aquamarine::aqua_runtime=error,ipfs_effector=off,ipfs_pure=off,system_services=debug,marine_core::module::marine_module=info,tokio_threadpool=info,tokio_reactor=info,mio=info,tokio_io=info,soketto=info,yamux=info,multistream_select=info,libp2p_secio=info,libp2p_websocket::framed=info,libp2p_ping=info,libp2p_core::upgrade::apply=info,libp2p_kad::kbucket=info,cranelift_codegen=info,wasmer_wasi=info,cranelift_codegen=info,wasmer_wasi=info,run-console=trace,wasmtime_cranelift=off,wasmtime_jit=off,libp2p_tcp=off,libp2p_swarm=off,particle_protocol::libp2p_protocol::upgrade=info,libp2p_mplex=off,particle_reap=off,netlink_proto=warn",
        FLUENCE_MAX_SPELL_PARTICLE_TTL: "9s",
        FLUENCE_ROOT_KEY_PAIR__PATH: `/run/secrets/${name}`,
      },
      command: [
        `--config=${configLocation}`,
        "--external-maddrs",
        `/dns4/${name}/tcp/${tcpPort}`,
        `/dns4/${name}/tcp/${webSocketPort}/ws`,
        "--allow-private-ips",
        bootstrapTcpPort === undefined
          ? "--local"
          : `--bootstraps=/dns/${bootstrapName}/tcp/${bootstrapTcpPort}`,
      ],
      depends_on: [IPFS_CONTAINER_NAME],
      volumes: [`./${CONFIGS_DIR_NAME}/${configTomlName}:${configLocation}`],
      secrets: [name],
    },
  ];
}

async function genDockerCompose(
  providerConfig: ProviderConfigReadonly,
): Promise<LatestConfig> {
  const configsDir = await ensureFluenceConfigsDir();
  const fluenceDir = getFluenceDir();

  const peers = await Promise.all(
    Object.entries(providerConfig.computePeers).map(async ([name, { nox }]) => {
      const relativeConfigFilePath = relative(
        fluenceDir,
        join(configsDir, getConfigTomlName(name)),
      );

      return {
        ...(await getSecretKeyOrReturnExisting(name)),
        webSocketPort: nox?.websocketPort,
        tcpPort: nox?.tcpPort,
        relativeConfigFilePath,
      };
    }),
  );

  const [bootstrap, ...restNoxes] = peers;

  assert(
    bootstrap !== undefined,
    `Unreachable. 'computePeers' non-emptiness is checked during ${PROVIDER_CONFIG_FULL_FILE_NAME} validation`,
  );

  const {
    name: bootstrapName,
    webSocketPort: bootstrapWebSocketPort = WEB_SOCKET_PORT_START,
    tcpPort: bootstrapTcpPort = TCP_PORT_START,
  } = bootstrap;

  return {
    version: "3",
    services: {
      [CHAIN_CONTAINER_NAME]: {
        image: versions.chain,
        ports: [`${CHAIN_PORT}:${CHAIN_PORT}`],
      },
      [IPFS_CONTAINER_NAME]: {
        image: "ipfs/go-ipfs",
        ports: [`${IPFS_PORT}:${IPFS_PORT}`, "4001:4001"],
        environment: {
          IPFS_PROFILE: "server",
        },
        volumes: [`./${IPFS_CONTAINER_NAME}/:/container-init.d/`],
      },
      ...Object.fromEntries([
        genNox({
          name: bootstrapName,
          tcpPort: bootstrapTcpPort,
          webSocketPort: bootstrapWebSocketPort,
          bootstrapName: bootstrapName,
        }),
      ]),
      ...Object.fromEntries(
        restNoxes.map(({ name, tcpPort, webSocketPort }, index) => {
          return genNox({
            name,
            tcpPort: tcpPort ?? TCP_PORT_START + index + 1,
            webSocketPort: webSocketPort ?? WEB_SOCKET_PORT_START + index + 1,
            bootstrapName: bootstrapName,
            bootstrapTcpPort,
          });
        }),
      ),
    },
    secrets: Object.fromEntries(
      peers.map(({ name, relativeSecretFilePath: file }) => {
        return [name, { file }] as const;
      }),
    ),
  };
}

async function genDefaultDockerCompose(
  providerConfig: ProviderConfigReadonly,
): Promise<GetDefaultConfig> {
  const def = await genDockerCompose(providerConfig);

  return () => {
    return yamlDiffPatch("", {}, def);
  };
}

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type DockerComposeConfig = InitializedConfig<LatestConfig>;
export type DockerComposeConfigReadonly =
  InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: DOCKER_COMPOSE_FILE_NAME,
  getConfigOrConfigDirPath: getFluenceDir,
};

export async function initNewDockerComposeConfig(args: ProviderConfigArgs) {
  const providerConfig = await initNewReadonlyProviderConfig(args);
  await ensureConfigToml(providerConfig);
  return getConfigInitFunction(
    initConfigOptions,
    await genDefaultDockerCompose(providerConfig),
  )();
}

export async function initNewReadonlyDockerComposeConfig(
  args: ProviderConfigArgs,
) {
  const providerConfig = await initNewReadonlyProviderConfig(args);
  await ensureConfigToml(providerConfig);
  return getReadonlyConfigInitFunction(
    initConfigOptions,
    await genDefaultDockerCompose(providerConfig),
  )();
}

export const initDockerComposeConfig = getConfigInitFunction(initConfigOptions);

export const initReadonlyDockerComposeConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const dockerComposeSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
