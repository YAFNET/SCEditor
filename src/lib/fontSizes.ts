/**
 * Maps font sizes 1-7 to font-size percentages
 */
export const fontSizePercents: Record<number, number> = {
	1: 50,
	2: 70,
	3: 80,
	4: 90,
	5: 100,
	6: 120,
	7: 140
};

/**
 * Converts a 1-7 font size to a percentage.
 *
 * Values outside 1-7 are clamped and non-numeric
 * values fall back to 100%.
 */
export function sizeToPercent(size: string | number | null | undefined): number {
	let num = parseInt(String(size ?? ''), 10);

	if (isNaN(num)) {
		num = 5;
	}

	return fontSizePercents[Math.min(Math.max(num, 1), 7)];
}

/**
 * Converts a percentage to the closest 1-7 font size
 */
export function percentToSize(percent: number): number {
	let closest = 1;

	for (let i = 2; i <= 7; i++) {
		if (Math.abs(fontSizePercents[i] - percent) <
			Math.abs(fontSizePercents[closest] - percent)) {
			closest = i;
		}
	}

	return closest;
}
