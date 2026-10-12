<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep Socilet as a frontend-only, explicitly labelled sample prototype; demo role selection is not authentication or a security boundary.
- Keep business rules and sample records in browser-safe library modules, with reusable screen components shared by individual TanStack content routes.
- Keep prototype edits in React session state, never representing sample approvals, commissions, or payouts as live transactions.
- Present all routes in a shared compact app viewport with bottom navigation and an accessible menu on every screen size, so desktop preview preserves the mobile experience.
