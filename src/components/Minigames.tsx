import toast from 'react-hot-toast';
import { FaGamepad } from 'react-icons/fa6';

function Minigames() {
	return (
		<div className="m-4 ml-2 w-full">
			<button
				className="flex h-14 w-14 items-center justify-center rounded-lg bg-neutral-50 p-4 ring-2 ring-neutral-800 transition-all duration-200 ease-in-out hover:bg-neutral-900 dark:bg-neutral-950"
				onClick={() => toast.error('NYI!')}>
				<FaGamepad className="h-10 w-10 fill-stone-300" size={'4em'} />
			</button>
		</div>
	);
}

export default Minigames;
