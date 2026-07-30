import { create } from 'zustand';

export type AiOperationKind =
  | 'ingesting'
  | 'generating-roadmap'
  | 'generating-lesson'
  | 'generating-quiz'
  | 'chatting';

export type AiOperationOwner = {
  type: 'material' | 'topic' | 'material-chat';
  id: string;
};

export type AiOperationStatus = 'running' | 'cancelling';
export type AiOperationOutcome = 'completed' | 'cancelled' | 'failed';

export type AiOperation = {
  id: string;
  kind: AiOperationKind;
  owner: AiOperationOwner;
  status: AiOperationStatus;
  startedAt: string;
};

export type CompletedAiOperation = AiOperation & {
  finishedAt: string;
  outcome: AiOperationOutcome;
};

export type AiOperationLease = {
  readonly operation: AiOperation;
  readonly cancellationRequested: boolean;
  isActive: () => boolean;
  assertActive: () => void;
};

export type AiOperationRequest = {
  kind: AiOperationKind;
  owner: AiOperationOwner;
  interrupt?: () => void;
};

type CoordinatorSnapshot = {
  activeOperation: AiOperation | null;
  lastOperation: CompletedAiOperation | null;
};

type CoordinatorControl = {
  operation: AiOperation;
  cancellationRequested: boolean;
  interrupt?: () => void;
};

type RuntimeCoordinatorStore = CoordinatorSnapshot;

export const useRuntimeCoordinatorStore = create<RuntimeCoordinatorStore>(
  () => ({
    activeOperation: null,
    lastOperation: null,
  })
);

export class AiOperationBusyError extends Error {
  readonly activeOperation: AiOperation;

  constructor(activeOperation: AiOperation) {
    super('Another offline AI task is already running.');
    this.name = 'AiOperationBusyError';
    this.activeOperation = activeOperation;
  }
}

export class AiOperationCancelledError extends Error {
  readonly operationId: string;

  constructor(operationId: string) {
    super('The offline AI task was stopped.');
    this.name = 'AiOperationCancelledError';
    this.operationId = operationId;
  }
}

export function isAiOperationCancelledError(
  error: unknown
): error is AiOperationCancelledError {
  return error instanceof AiOperationCancelledError;
}

export function isAiOperationBusyError(
  error: unknown
): error is AiOperationBusyError {
  return error instanceof AiOperationBusyError;
}

type SnapshotListener = (snapshot: CoordinatorSnapshot) => void;

export class RuntimeCoordinator {
  private active: CoordinatorControl | null = null;
  private lastOperation: CompletedAiOperation | null = null;
  private sequence = 0;

  constructor(
    private readonly onSnapshot?: SnapshotListener
  ) {}

  getSnapshot(): CoordinatorSnapshot {
    return {
      activeOperation: this.active?.operation ?? null,
      lastOperation: this.lastOperation,
    };
  }

  async run<T>(
    request: AiOperationRequest,
    task: (lease: AiOperationLease) => Promise<T>
  ): Promise<T> {
    const lease = this.acquire(request);

    try {
      const result = await task(lease);
      lease.assertActive();
      this.finish(lease.operation.id, 'completed');
      return result;
    } catch (error) {
      const cancelled =
        lease.cancellationRequested ||
        isAiOperationCancelledError(error);
      this.finish(
        lease.operation.id,
        cancelled ? 'cancelled' : 'failed'
      );
      if (cancelled && !isAiOperationCancelledError(error)) {
        throw new AiOperationCancelledError(lease.operation.id);
      }
      throw error;
    }
  }

  cancel(kind: AiOperationKind, owner: AiOperationOwner) {
    const control = this.active;
    if (
      !control ||
      control.operation.kind !== kind ||
      control.operation.owner.type !== owner.type ||
      control.operation.owner.id !== owner.id
    ) {
      return false;
    }
    if (control.cancellationRequested) {
      return true;
    }

    control.cancellationRequested = true;
    control.operation = {
      ...control.operation,
      status: 'cancelling',
    };
    this.publish();
    try {
      control.interrupt?.();
    } catch {
      // The lease remains cancelled even if the native interrupt reports an error.
    }
    return true;
  }

  private acquire(request: AiOperationRequest): AiOperationLease {
    if (this.active) {
      throw new AiOperationBusyError(this.active.operation);
    }

    const operation: AiOperation = {
      id: `ai-operation-${Date.now()}-${++this.sequence}`,
      kind: request.kind,
      owner: request.owner,
      status: 'running',
      startedAt: new Date().toISOString(),
    };
    const control: CoordinatorControl = {
      operation,
      cancellationRequested: false,
      interrupt: request.interrupt,
    };
    this.active = control;
    this.publish();

    return {
      get operation() {
        return control.operation;
      },
      get cancellationRequested() {
        return control.cancellationRequested;
      },
      isActive: () =>
        this.active === control && !control.cancellationRequested,
      assertActive: () => {
        if (
          this.active !== control ||
          control.cancellationRequested
        ) {
          throw new AiOperationCancelledError(control.operation.id);
        }
      },
    };
  }

  private finish(
    operationId: string,
    outcome: AiOperationOutcome
  ) {
    if (!this.active || this.active.operation.id !== operationId) {
      return;
    }

    this.lastOperation = {
      ...this.active.operation,
      finishedAt: new Date().toISOString(),
      outcome,
    };
    this.active = null;
    this.publish();
  }

  private publish() {
    this.onSnapshot?.(this.getSnapshot());
  }
}

export const runtimeCoordinator = new RuntimeCoordinator((snapshot) => {
  useRuntimeCoordinatorStore.setState(snapshot);
});
