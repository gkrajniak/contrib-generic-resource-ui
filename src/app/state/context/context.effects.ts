import { contextInitialized, contextUpdated } from './context.actions';
import { loadSchema } from '../schema/schema.actions';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, map, tap } from 'rxjs/operators';

@Injectable()
export class ContextEffects {
  private actions$ = inject(Actions);

  contextInitialized$ = createEffect(() =>
    this.actions$.pipe(
      ofType(contextInitialized),
      tap(({ context }) => {
        console.log('[ContextEffects] contextInitialized received:', context);
        console.log('[ContextEffects] resourceDefinition:', context.resourceDefinition);
        console.log('[ContextEffects] portalContext:', context.portalContext);
      }),
      map(({ context }) =>
        loadSchema({ resourceDefinition: context.resourceDefinition })
      )
    )
  );

  contextUpdated$ = createEffect(() =>
    this.actions$.pipe(
      ofType(contextUpdated),
      tap(({ context }) => {
        console.log('[ContextEffects] contextUpdated received:', context);
        console.log('[ContextEffects] resourceDefinition:', context.resourceDefinition);
        console.log('[ContextEffects] portalContext:', context.portalContext);
      }),
      filter(({ context }) => !!context.resourceDefinition),
      map(({ context }) =>
        loadSchema({ resourceDefinition: context.resourceDefinition })
      )
    )
  );
}
