import { Injectable } from '@angular/core';
import {
  Condition,
  IN_PROGRESS_PHASES,
  NOT_READY_PHASES,
  READY_PHASES,
  ReadyStatus,
  ReadyStatusType,
  Resource,
} from 'models/index';

@Injectable({
  providedIn: 'root',
})
export class ReadyStatusDetectorService {
  detectReadyStatus(resource: Resource): ReadyStatus {
    const status = resource.status;

    if (!status) {
      return this.createUnknownStatus();
    }

    const conditionsStatus = this.checkConditions(status['conditions'] as Condition[] | undefined);
    if (conditionsStatus) {
      return conditionsStatus;
    }

    const phaseStatus = this.checkPhase(status['phase'] as string | undefined);
    if (phaseStatus) {
      return phaseStatus;
    }

    const readyFieldStatus = this.checkReadyField(status['ready'] as boolean | undefined);
    if (readyFieldStatus) {
      return readyFieldStatus;
    }

    const stateStatus = this.checkState(status['state'] as string | undefined);
    if (stateStatus) {
      return stateStatus;
    }

    return this.createUnknownStatus();
  }

  private checkConditions(conditions: Condition[] | undefined): ReadyStatus | null {
    if (!conditions || !Array.isArray(conditions)) {
      return null;
    }

    const readyCondition = conditions.find(
      (c) => c.type?.toLowerCase() === 'ready'
    );

    if (readyCondition) {
      return {
        isReady: readyCondition.status === 'True',
        status: this.conditionStatusToReadyStatus(readyCondition.status),
        message: readyCondition.message,
        reason: readyCondition.reason,
        lastTransitionTime: readyCondition.lastTransitionTime,
      };
    }

    const availableCondition = conditions.find(
      (c) => c.type?.toLowerCase() === 'available'
    );

    if (availableCondition) {
      return {
        isReady: availableCondition.status === 'True',
        status: this.conditionStatusToReadyStatus(availableCondition.status),
        message: availableCondition.message,
        reason: availableCondition.reason,
        lastTransitionTime: availableCondition.lastTransitionTime,
      };
    }

    return null;
  }

  private checkPhase(phase: string | undefined): ReadyStatus | null {
    if (!phase) {
      return null;
    }

    const normalizedPhase = phase.toLowerCase();

    if (READY_PHASES.some((p) => p.toLowerCase() === normalizedPhase)) {
      return {
        isReady: true,
        status: 'ready',
        message: phase,
      };
    }

    if (NOT_READY_PHASES.some((p) => p.toLowerCase() === normalizedPhase)) {
      return {
        isReady: false,
        status: 'not-ready',
        message: phase,
      };
    }

    if (IN_PROGRESS_PHASES.some((p) => p.toLowerCase() === normalizedPhase)) {
      return {
        isReady: false,
        status: 'in-progress',
        message: phase,
      };
    }

    return null;
  }

  private checkReadyField(ready: boolean | undefined): ReadyStatus | null {
    if (typeof ready !== 'boolean') {
      return null;
    }

    return {
      isReady: ready,
      status: ready ? 'ready' : 'not-ready',
    };
  }

  private checkState(state: string | undefined): ReadyStatus | null {
    if (!state) {
      return null;
    }

    const readyStates = ['ready', 'active', 'running', 'available', 'healthy'];
    const notReadyStates = ['error', 'failed', 'unhealthy', 'terminated'];
    const inProgressStates = ['pending', 'creating', 'initializing'];

    const normalizedState = state.toLowerCase();

    if (readyStates.includes(normalizedState)) {
      return {
        isReady: true,
        status: 'ready',
        message: state,
      };
    }

    if (notReadyStates.includes(normalizedState)) {
      return {
        isReady: false,
        status: 'not-ready',
        message: state,
      };
    }

    if (inProgressStates.includes(normalizedState)) {
      return {
        isReady: false,
        status: 'in-progress',
        message: state,
      };
    }

    return null;
  }

  private conditionStatusToReadyStatus(
    status: 'True' | 'False' | 'Unknown'
  ): ReadyStatusType {
    switch (status) {
      case 'True':
        return 'ready';
      case 'False':
        return 'not-ready';
      default:
        return 'unknown';
    }
  }

  private createUnknownStatus(): ReadyStatus {
    return {
      isReady: false,
      status: 'unknown',
    };
  }
}
