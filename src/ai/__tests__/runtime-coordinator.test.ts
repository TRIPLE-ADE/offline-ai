import {
  AiOperationBusyError,
  AiOperationCancelledError,
  RuntimeCoordinator,
} from '@/ai/runtime-coordinator';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

const lessonOwner = { type: 'topic', id: 'topic-1' } as const;
const chatOwner = {
  type: 'material-chat',
  id: 'material-1',
} as const;

describe('runtime coordinator', () => {
  it('rejects a competing operation deterministically', async () => {
    const coordinator = new RuntimeCoordinator();
    const running = deferred<void>();
    const first = coordinator.run(
      {
        kind: 'generating-lesson',
        owner: lessonOwner,
      },
      () => running.promise
    );

    await expect(
      coordinator.run(
        {
          kind: 'chatting',
          owner: chatOwner,
        },
        async () => undefined
      )
    ).rejects.toBeInstanceOf(AiOperationBusyError);

    running.resolve();
    await first;
    expect(coordinator.getSnapshot().activeOperation).toBeNull();
  });

  it('always releases a failed operation', async () => {
    const coordinator = new RuntimeCoordinator();

    await expect(
      coordinator.run(
        {
          kind: 'generating-lesson',
          owner: lessonOwner,
        },
        async () => {
          throw new Error('Generation failed');
        }
      )
    ).rejects.toThrow('Generation failed');

    expect(coordinator.getSnapshot().activeOperation).toBeNull();
    expect(coordinator.getSnapshot().lastOperation?.outcome).toBe('failed');
    await expect(
      coordinator.run(
        {
          kind: 'chatting',
          owner: chatOwner,
        },
        async () => 'ready'
      )
    ).resolves.toBe('ready');
  });

  it('cancels only the matching owner and interrupts once', async () => {
    const coordinator = new RuntimeCoordinator();
    const running = deferred<void>();
    const interrupt = jest.fn();
    let isLeaseActive = () => false;
    const operation = coordinator.run(
      {
        kind: 'chatting',
        owner: chatOwner,
        interrupt,
      },
      (activeLease) => {
        isLeaseActive = activeLease.isActive;
        return running.promise;
      }
    );

    expect(
      coordinator.cancel('chatting', {
        type: 'material-chat',
        id: 'material-2',
      })
    ).toBe(false);
    expect(coordinator.cancel('chatting', chatOwner)).toBe(true);
    expect(coordinator.cancel('chatting', chatOwner)).toBe(true);
    expect(interrupt).toHaveBeenCalledTimes(1);
    expect(isLeaseActive()).toBe(false);
    expect(
      coordinator.getSnapshot().activeOperation?.status
    ).toBe('cancelling');

    running.resolve();
    await expect(operation).rejects.toBeInstanceOf(
      AiOperationCancelledError
    );
    expect(coordinator.getSnapshot().lastOperation?.outcome).toBe(
      'cancelled'
    );
  });

  it('prevents late callbacks after cancellation', async () => {
    const coordinator = new RuntimeCoordinator();
    const running = deferred<void>();
    const received: string[] = [];
    let emit = (_value: string) => undefined;
    const operation = coordinator.run(
      {
        kind: 'chatting',
        owner: chatOwner,
      },
      async (lease) => {
        emit = (value) => {
          if (lease.isActive()) {
            received.push(value);
          }
        };
        await running.promise;
      }
    );

    emit('before');
    coordinator.cancel('chatting', chatOwner);
    emit('after');
    running.resolve();

    await expect(operation).rejects.toBeInstanceOf(
      AiOperationCancelledError
    );
    expect(received).toEqual(['before']);
  });
});
