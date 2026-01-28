export default function DashboardHome() {
    return (
        <div
            className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 text-center"
            style={{ backgroundColor: "var(--background)" }}
        >
            <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: "var(--background-tertiary)" }}
            >
                <div
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: "var(--color-primary)" }}
                />
            </div>
            <h1
                className="text-2xl font-semibold mb-2"
                style={{ color: "var(--foreground)" }}
            >
                지식 베이스에 오신 것을 환영합니다
            </h1>
            <p
                className="max-w-sm"
                style={{ color: "var(--foreground-secondary)" }}
            >
                사이드바에서 페이지를 선택하거나 새로운 페이지를 만들어 지식 증류를 시작하세요.
            </p>
        </div>
    );
}
