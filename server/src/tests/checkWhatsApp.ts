import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Settings from '../models/Settings.js';
import User from '../models/User.js';

dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI!);
    const user = await User.findOne({ username: 'corewave' });
    if (!user) {
        console.log('User not found');
        process.exit(1);
    }

    // Check for WhatsApp credentials in env
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
        console.log('❌ WhatsApp credentials not found in .env file!');
        console.log('   Please uncomment WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env\n');
        process.exit(1);
    }
    if (!process.env.WHATSAPP_IMAGE_URL?.startsWith('https://')) {
        console.log('❌ WHATSAPP_IMAGE_URL must be a public HTTPS URL.');
        console.log('   Upload the onboarding image to Cloudinary and paste its secure URL in .env\n');
        process.exit(1);
    }

    console.log('📱 WhatsApp credentials found in .env:');
    console.log(`   Phone Number ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
    console.log(`   Access Token: ${process.env.WHATSAPP_ACCESS_TOKEN.substring(0, 20)}...`);
    console.log(`   Header Image URL: ${process.env.WHATSAPP_IMAGE_URL || 'Not set'}`);
    console.log(`   Legacy Image ID: ${process.env.WHATSAPP_IMAGE_ID || 'Not set'}\n`);

    let settings = await Settings.findOne({ gymId: user.gymId });

    if (!settings) {
        console.log('No settings found. Creating with WhatsApp enabled...\n');

        settings = await Settings.create({
            gymId: user.gymId,
            whatsapp: {
                active: true,
                phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
                accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
                headerImageUrl: process.env.WHATSAPP_IMAGE_URL,
                headerImageId: process.env.WHATSAPP_IMAGE_ID,
                sendOnOnboarding: true,
                sendOnRenewal: true,
                sendOnExpiry: true,
                sendOnReminder: true,
                reminderDays: 3
            }
        });
        console.log('✅ WhatsApp settings created and enabled!');
    } else {
        console.log('Updating WhatsApp settings...\n');

        settings = await Settings.findByIdAndUpdate(
            settings._id,
            {
                'whatsapp.active': true,
                'whatsapp.phoneNumberId': process.env.WHATSAPP_PHONE_NUMBER_ID,
                'whatsapp.accessToken': process.env.WHATSAPP_ACCESS_TOKEN,
                'whatsapp.headerImageUrl': process.env.WHATSAPP_IMAGE_URL,
                'whatsapp.headerImageId': process.env.WHATSAPP_IMAGE_ID,
                'whatsapp.sendOnOnboarding': true,
                'whatsapp.sendOnRenewal': true,
                'whatsapp.sendOnExpiry': true,
                'whatsapp.sendOnReminder': true,
                'whatsapp.reminderDays': 3
            },
            { new: true }
        );

        console.log('✅ WhatsApp settings updated!');
    }

    console.log('\n📊 Current Settings:');
    console.log(`   Active: ${settings?.whatsapp?.active}`);
    console.log(`   Phone Number ID: ${settings?.whatsapp?.phoneNumberId}`);
    console.log(`   Header Image URL: ${settings?.whatsapp?.headerImageUrl || 'Not set'}`);
    console.log(`   Legacy Header Image ID: ${settings?.whatsapp?.headerImageId || 'Not set'}`);
    console.log(`   Send on Onboarding: ${settings?.whatsapp?.sendOnOnboarding}`);
    console.log(`   Send on Renewal: ${settings?.whatsapp?.sendOnRenewal}`);
    console.log(`   Send on Expiry: ${settings?.whatsapp?.sendOnExpiry}`);
    console.log(`   Send on Reminder: ${settings?.whatsapp?.sendOnReminder}\n`);

    await mongoose.disconnect();
}

main();
