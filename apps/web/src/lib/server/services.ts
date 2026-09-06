import {
  argon2Hasher,
  db,
  nodeRandomSource,
  nodeSecureTokens,
  nodeTokenDigester,
  pgBlocklistChecker,
  pgUnitOfWork,
  systemClock,
} from '@chorify/db';
import {
  AuthService,
  HouseholdsService,
  OccurrencesService,
  PeopleService,
  ResponsibilitiesService,
  RolesService,
  RoutinesService,
} from '@chorify/core';

/**
 * Route-layer composition root: core services bound to the pg edge exactly
 * once. Controllers call these singletons — never `new` services inline.
 */
const uow = pgUnitOfWork(db);

export const householdsService = new HouseholdsService(uow, nodeRandomSource, pgBlocklistChecker(db));

export const authService = new AuthService(
  uow,
  argon2Hasher,
  nodeSecureTokens,
  nodeTokenDigester,
  systemClock,
  householdsService,
);

export const peopleService = new PeopleService(uow);

export const rolesService = new RolesService(uow);

export const routinesService = new RoutinesService(uow);

export const responsibilitiesService = new ResponsibilitiesService(uow, systemClock);

export const occurrencesService = new OccurrencesService(uow, systemClock);

export { uow };
