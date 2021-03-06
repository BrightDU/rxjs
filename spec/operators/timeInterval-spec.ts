import { expect } from 'chai';
import { hot, cold, expectObservable, expectSubscriptions } from '../helpers/marble-testing';
import { timeInterval, map, mergeMap, take } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { of, Observable } from 'rxjs';
import { TimeInterval } from 'rxjs/internal/operators/timeInterval';

declare const rxTestScheduler: TestScheduler;

/** @test {timeInterval} */
describe('timeInterval operator', () => {
  it('should record the time interval between source elements', () => {
    const e1 = hot('--a--^b-c-----d--e--|');
    const e1subs =      '^              !';
    const expected =    '-w-x-----y--z--|';
    const expectedValue = { w: 10, x: 20, y: 60, z: 30 };

    const result = (<any>e1).pipe(
      timeInterval(rxTestScheduler),
      map((x: any) => x.interval)
    );

    expectObservable(result).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should record interval if source emit elements', () => {
    const e1 = hot('--a--^b--c----d---e--|');
    const e1subs =      '^               !';
    const expected =    '-w--x----y---z--|';

    const expectedValue = {
      w: new TimeInterval('b', 10),
      x: new TimeInterval('c', 30),
      y: new TimeInterval('d', 50),
      z: new TimeInterval('e', 40)
    };

    expectObservable((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should completes without record interval if source does not emits', () => {
    const e1 =   hot('---------|');
    const e1subs =   '^        !';
    const expected = '---------|';

    expectObservable((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete immediately if source is empty', () => {
    const e1 =  cold('|');
    const e1subs =   '(^!)';
    const expected = '|';

    expectObservable((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should record interval then does not completes if source emits but not completes', () => {
    const e1 =   hot('-a--b--');
    const e1subs =   '^      ';
    const expected = '-y--z--';

    const expectedValue = {
      y: new TimeInterval('a', 10),
      z: new TimeInterval('b', 30)
    };

    expectObservable((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 =   hot('-a--b-----c---d---|');
    const unsub =    '       !           ';
    const e1subs =   '^      !           ';
    const expected = '-y--z---           ';

    const expectedValue = {
      y: new TimeInterval('a', 10),
      z: new TimeInterval('b', 30)
    };

    const result = (<any>e1).pipe(timeInterval(rxTestScheduler));

    expectObservable(result, unsub).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 =   hot('-a--b-----c---d---|');
    const e1subs =   '^      !           ';
    const expected = '-y--z---           ';
    const unsub =    '       !           ';

    const expectedValue = {
      y: new TimeInterval('a', 10),
      z: new TimeInterval('b', 30)
    };

    const result = (<any>e1).pipe(
      mergeMap((x: string) => of(x)),
      timeInterval(rxTestScheduler),
      mergeMap((x: string) => of(x))
    );

    expectObservable(result, unsub).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes if source never completes', () => {
    const e1 =  cold('-');
    const e1subs =   '^';
    const expected = '-';

    expectObservable((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('raise error if source raises error', () => {
    const e1 =   hot('---#');
    const e1subs =   '^  !';
    const expected = '---#';

    expectObservable((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should record interval then raise error if source raises error after emit', () => {
    const e1 =   hot('-a--b--#');
    const e1subs =   '^      !';
    const expected = '-y--z--#';

    const expectedValue = {
      y: new TimeInterval('a', 10),
      z: new TimeInterval('b', 30)
    };

    expectObservable((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if source immediately throws', () => {
    const e1 =  cold('#');
    const e1subs =   '(^!)';
    const expected = '#';

    expectObservable((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should stop listening to a synchronous observable when unsubscribed', () => {
    const sideEffects: number[] = [];
    const synchronousObservable = new Observable<number>(subscriber => {
      // This will check to see if the subscriber was closed on each loop
      // when the unsubscribe hits (from the `take`), it should be closed
      for (let i = 0; !subscriber.closed && i < 10; i++) {
        sideEffects.push(i);
        subscriber.next(i);
      }
    });

    synchronousObservable.pipe(
      timeInterval(),
      take(3),
    ).subscribe(() => { /* noop */ });

    expect(sideEffects).to.deep.equal([0, 1, 2]);
  });
});
