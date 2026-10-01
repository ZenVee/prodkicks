-- Homepage is public for everyone. Remove the unused homepage.view permission.

delete from public.role_permissions where permission_key = 'homepage.view';
delete from public.permissions where key = 'homepage.view';
