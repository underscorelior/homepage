// TODO: Custom times and dates using settings.

import { Button } from '@/shadcn/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/shadcn/components/ui/dialog';
import { Input } from '@/shadcn/components/ui/input';
import { Label } from '@/shadcn/components/ui/label';
import { useEffect, useState } from 'react';
import { TiCalendar } from 'react-icons/ti';
import { parseAbsolute } from '@internationalized/date';

import { DateTimePicker } from '@/shadcn/components/ui/date-time-picker/date-time-picker';
import { TbTrash } from 'react-icons/tb';

function Countdown({ cds }: { cds: Countdown[] }) {
	const [countdowns, setCountdowns] = useState<Countdown[]>([]);

	function calcDiff(diff: number) {
		diff -= Date.now();

		let days = Math.floor(diff / (1000 * 60 * 60 * 24)).toString();
		let hours = Math.floor(
			(diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
		).toString();
		let mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString();
		let secs = Math.floor((diff % (1000 * 60)) / 1000).toString();

		days = '0'.repeat(3 - days.length) + days + 'd';
		hours = '0'.repeat(2 - hours.length) + hours + 'h';
		mins = '0'.repeat(2 - mins.length) + mins + 'm';
		secs = '0'.repeat(2 - secs.length) + secs + 's';

		return [days, hours, mins, secs].join(' ');
	}

	useEffect(() => {
		const interval = setInterval(() => {
			setCountdowns(
				cds.map((cd) => ({
					...cd,
					cooldown: calcDiff(cd.timestamp),
				})),
			);
		}, 1);

		return () => {
			clearInterval(interval);
		};
	}, [cds]);
	return (
		<div className="fixed bottom-0 right-0 flex flex-col rounded-tl-lg border-l-2 border-t-2 border-neutral-600 bg-neutral-50 p-4 text-xl font-bold dark:border-neutral-800 dark:bg-neutral-950">
			{countdowns.map((cd, i) => (
				<span
					className="flex flex-col text-zinc-800 dark:text-zinc-300"
					key={i}>
					{cd.name}:
					<span className="text-end font-mono text-lg font-semibold">
						{calcDiff(cd.timestamp)}
					</span>
				</span>
			))}
		</div>
	);
}

export default Countdown;

export function CountdownItem({
	name,
	timestamp,
	setCountdowns,
	countdowns,
}: {
	name: string;
	timestamp: number;
	setCountdowns: (s: Countdown[]) => void;
	countdowns: Countdown[];
}) {
	const [ts, setTs] = useState<number>(timestamp);
	const [cdName, setName] = useState<string>(name);

	useEffect(() => {
		setTs(ts);
		setName(cdName);
	}, [ts]);

	function syncCountdowns(newName: string, newTimestamp: number) {
		let cds = countdowns.map((cd) => {
			if (cd.name == name) {
				return {
					name: newName,
					timestamp: newTimestamp,
				};
			} else {
				return cd;
			}
		});
		localStorage.setItem('countdowns', JSON.stringify(cds));
		setCountdowns(cds);
	}

	return (
		<div className="flex flex-row items-center justify-between gap-4 rounded-lg border-[1.5px] border-neutral-500 px-3 py-2 dark:border-neutral-700">
			<div className="flex flex-col">
				<h3 className="font-medium">{cdName}</h3>
				<p className="font-mono text-sm">{new Date(ts).toLocaleString()}</p>
			</div>
			<CountdownEditPopup
				name={cdName}
				timestamp={ts}
				setOuterTimestamp={setTs}
				setOuterName={setName}
				syncCountdowns={syncCountdowns}
			/>
		</div>
	);
}

function CountdownEditPopup({
	name,
	timestamp,
	setOuterTimestamp,
	setOuterName,
	syncCountdowns,
}: {
	name: string;
	timestamp: number;
	setOuterTimestamp: (timestamp: number) => void;
	setOuterName: (name: string) => void;
	syncCountdowns: (name: string, timestamp: number) => void;
}) {
	const [ts, setTimestamp] = useState<number>(timestamp);
	const [cdName, setName] = useState<string>(name);
	const [open, setOpen] = useState(false);
	const [shift, setShift] = useState<boolean>(false);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.shiftKey && !open) {
				setShift(true);
			}
		}

		function handleKeyUp(event: KeyboardEvent) {
			if (!event.shiftKey && !open) {
				setShift(false);
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	function onSubmit() {
		// TODO: Check if valid on submit
		syncCountdowns(cdName, ts);
		setOpen(false);
		setOuterTimestamp(ts);
		setOuterName(cdName);
	}

	return (
		<>
			{!shift || open ? (
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger className="flex aspect-square size-auto rounded-lg border border-neutral-400 p-2 dark:border-neutral-500">
						<TiCalendar />
					</DialogTrigger>
					<DialogContent className="sm:max-w-[425px] dark:text-neutral-100">
						<DialogHeader>
							<DialogTitle className="text-2xl font-semibold dark:text-neutral-100">
								Editing: {name}
							</DialogTitle>
						</DialogHeader>
						<div className="flex flex-col gap-y-2 py-4">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								className="mb-3"
								defaultValue={name}
								onChange={(x) => setName(x.target.value)}
							/>

							<Label htmlFor="time">Time</Label>
							<DateTimePicker
								defaultValue={parseAbsolute(
									new Date(timestamp).toISOString(),
									Intl.DateTimeFormat().resolvedOptions().timeZone,
								)}
								minValue={parseAbsolute(
									new Date().toISOString(),
									Intl.DateTimeFormat().resolvedOptions().timeZone,
								)}
								granularity={'minute'}
								onChange={(dv) => {
									setTimestamp(
										dv
											.toDate(Intl.DateTimeFormat().resolvedOptions().timeZone)
											.getTime(),
									);
								}}
							/>
						</div>
						<DialogFooter className="flex w-full flex-row gap-2">
							<DialogClose>
								<Button variant="ghost">Cancel</Button>
							</DialogClose>
							<Button type="submit" onClick={() => onSubmit()}>
								Save
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			) : (
				<div className="flex aspect-square h-full w-auto rounded-lg border border-neutral-400 p-2 dark:border-neutral-500">
					<TbTrash />
				</div>
			)}
		</>
	);
}
