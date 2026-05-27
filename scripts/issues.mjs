#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const AGENT_IDENTITY = {
  issuer: 'codex-agent',
  name: 'Codex',
  subject: 'issues',
  tokenIdentifier: 'codex-agent:issues',
};

const STATUSES = new Set(['triage', 'ready_to_implement', 'ongoing', 'completed']);
const TYPES = new Set(['bug', 'feature']);

function printHelp() {
  console.log(`Usage:
  npm run issues -- list [--limit 100]
  npm run issues -- show <issueId>
  npm run issues -- create --title "..." --description "..." --type bug|feature
  npm run issues -- update <issueId> [--title "..."] [--description "..."] [--type bug|feature] [--status triage|ready_to_implement|ongoing|completed]
  npm run issues -- status <issueId> <status>
  npm run issues -- delete <issueId>`);
}

function readFlag(args, name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function optionalLimit(args) {
  const rawLimit = readFlag(args, '--limit');
  if (!rawLimit) {
    return undefined;
  }
  const limit = Number(rawLimit);
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error('--limit must be a positive number');
  }
  return limit;
}

function requireType(type) {
  if (!TYPES.has(type ?? '')) {
    throw new Error('--type must be bug or feature');
  }
  return type;
}

function requireStatus(status) {
  if (!STATUSES.has(status ?? '')) {
    throw new Error('status must be triage, ready_to_implement, ongoing, or completed');
  }
  return status;
}

function getConvexEnv() {
  const deployKey = process.env.CODEX_CONVEX_KEY || process.env.CONVEX_DEPLOY_KEY;
  if (!deployKey) {
    throw new Error('Set CODEX_CONVEX_KEY or CONVEX_DEPLOY_KEY before running this script.');
  }

  return {
    ...process.env,
    CONVEX_DEPLOY_KEY: deployKey,
  };
}

function runConvex(functionName, payload) {
  const result = spawnSync(
    'npx',
    [
      'convex',
      'run',
      '--prod',
      '--typecheck',
      'disable',
      '--codegen',
      'disable',
      '--identity',
      JSON.stringify(AGENT_IDENTITY),
      functionName,
      JSON.stringify(payload),
    ],
    {
      env: getConvexEnv(),
      stdio: 'inherit',
    }
  );

  process.exitCode = result.status ?? 1;
}

function getPayload(command, args) {
  switch (command) {
    case 'list':
      return ['issues:agentList', { limit: optionalLimit(args) }];
    case 'show':
      return ['issues:agentGet', { issueId: requireValue(args[0], 'Missing issue id') }];
    case 'create':
      return [
        'issues:agentCreate',
        {
          description: requireValue(readFlag(args, '--description'), 'Missing --description'),
          title: requireValue(readFlag(args, '--title'), 'Missing --title'),
          type: requireType(readFlag(args, '--type')),
        },
      ];
    case 'update': {
      const payload = {
        issueId: requireValue(args[0], 'Missing issue id'),
      };
      const title = readFlag(args, '--title');
      const description = readFlag(args, '--description');
      const type = readFlag(args, '--type');
      const status = readFlag(args, '--status');

      if (title) payload.title = title;
      if (description) payload.description = description;
      if (type) payload.type = requireType(type);
      if (status) payload.status = requireStatus(status);

      return ['issues:agentUpdate', payload];
    }
    case 'status':
      return [
        'issues:agentSetStatus',
        {
          issueId: requireValue(args[0], 'Missing issue id'),
          status: requireStatus(args[1]),
        },
      ];
    case 'delete':
      return ['issues:agentRemove', { issueId: requireValue(args[0], 'Missing issue id') }];
    default:
      printHelp();
      process.exit(1);
  }
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help') {
    printHelp();
    process.exit(0);
  }

  const [functionName, payload] = getPayload(command, args);
  runConvex(functionName, payload);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
