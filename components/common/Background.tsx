/**
 * Background Component - Cool Technical Background
 */

export function Background() {
  return (
      <div className="fixed inset-0 -z-10 h-full w-full bg-background">
      {/* Grid Pattern */}
          <div
              className="absolute h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)]"></div>

      {/* Ambient Glows */}
          <div
              className="absolute left-0 right-0 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#FFB10322,#0000)] opacity-80 blur-[90px] dark:opacity-60"></div>
          <div
              className="absolute bottom-0 right-0 h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#1C1C1E15,#0000)] opacity-50 blur-[90px] dark:opacity-30"></div>
    </div>
  );
}
