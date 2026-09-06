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
  HomeService,
  HouseholdsService,
  OccurrencesService,
  PeopleService,
  PortabilityService,
  ResourcesService,
  ResponsibilitiesService,
  RolesService,
  RoutinesService,
  SocialService,
  SyncService,
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

export const homeService = new HomeService(uow);

export const resourcesService = new ResourcesService(uow, systemClock);

export const socialService = new SocialService(uow, systemClock);

export const syncService = new SyncService(uow);

export const portabilityService = new PortabilityService(uow, systemClock, householdsService);

export { uow };
