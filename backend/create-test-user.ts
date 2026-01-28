import { supabaseAdmin } from './src/config/supabase.js';

async function createTestUser() {
    const email = 'test@distillai.com';
    const password = 'Password123!';

    console.log(`Creating test user: ${email}`);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: 'Test Admin' }
    });

    if (error) {
        if (error.message.includes('already registered')) {
            console.log('User already exists. Updating password...');
            const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
            const user = userData.users.find(u => u.email === email);
            if (user) {
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    user.id,
                    { password }
                );
                if (updateError) console.error('Error updating user:', updateError);
                else console.log('Password updated successfully.');
            }
        } else {
            console.error('Error creating user:', error);
        }
    } else {
        console.log('Test user created successfully:', data.user.id);
    }
}

createTestUser();
